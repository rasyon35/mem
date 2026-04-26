import re
from datetime import datetime
from collections import defaultdict

import requests
from django.db import transaction
from django.db.models import Q
from django.utils.text import slugify
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Subtopic, Topic, WorkspacePage, PageBlock, PageLink, PageRevision
from .ontology import entity_alias_map, normalize_entities_for_page
from .wiki_projection import archive_page_file, markdown_page_paths, sync_wiki_to_db, workspace_wiki_dir, write_page_to_file


def _workspace_file_pages():
    wiki_dir = workspace_wiki_dir()
    pages = []
    for md_file in sorted(wiki_dir.glob("*.md")):
        if md_file.name in ("index.md", "log.md"):
            continue
        pages.append(
            {
                "slug": slugify(md_file.stem)[:220] or md_file.stem,
                "title": md_file.stem.replace("_", " "),
                "updated_at": datetime.utcfromtimestamp(md_file.stat().st_mtime).isoformat(),
            }
        )
    return pages


def _ensure_db_page_for_file(file_page):
    slug = file_page["slug"]
    page = WorkspacePage.objects.select_related("topic", "subtopic").filter(slug=slug).first()
    if page:
        needs_update = False
        if page.title != file_page["title"]:
            page.title = file_page["title"]
            needs_update = True
        source_path = str(workspace_wiki_dir() / f"{slug}.md")
        if page.source_path != source_path:
            page.source_path = source_path
            needs_update = True
        if page.status != "active":
            page.status = "active"
            needs_update = True
        if needs_update:
            page.save(update_fields=["title", "source_path", "status", "updated_at"])
        return page

    return WorkspacePage.objects.create(
        slug=slug,
        title=file_page["title"],
        source_path=str(workspace_wiki_dir() / f"{slug}.md"),
        status="active",
    )


def _serialize_block(block):
    return {
        "id": block.id,
        "page_id": block.page_id,
        "parent_block_id": block.parent_block_id,
        "block_type": block.block_type,
        "content_json": block.content_json,
        "order_index": block.order_index,
        "updated_at": block.updated_at.isoformat(),
    }


def _serialize_page(page, include_blocks=False):
    payload = {
        "id": page.id,
        "slug": page.slug,
        "title": page.title,
        "icon": page.icon,
        "cover": page.cover,
        "status": page.status,
        "last_edited_by": page.last_edited_by,
        "source_path": page.source_path,
        "topic_id": page.topic_id,
        "topic_name": page.topic.name if page.topic else "",
        "subtopic_id": page.subtopic_id,
        "subtopic_name": page.subtopic.name if page.subtopic else "",
        "tags": page.tags or [],
        "description": page.description,
        "page_type": page.page_type,
        "visibility": page.visibility,
        "publish_state": page.publish_state,
        "is_favorite": page.is_favorite,
        "ingestion_status": page.ingestion_status,
        "version": page.version,
        "created_at": page.created_at.isoformat(),
        "updated_at": page.updated_at.isoformat(),
    }
    if include_blocks:
        payload["blocks"] = [_serialize_block(b) for b in page.blocks.all()]
    return payload


def _extract_wikilinks(text):
    return re.findall(r"\[\[([^\]]+)\]\]", text or "")


def _refresh_page_links(page):
    PageLink.objects.filter(from_page=page).delete()
    candidate_pages = WorkspacePage.objects.exclude(id=page.id)
    title_to_page = {p.title.lower(): p for p in candidate_pages}
    slug_to_page = {p.slug.lower(): p for p in candidate_pages}
    alias_map = entity_alias_map()
    for block in page.blocks.all():
        content = block.content_json.get("text", "") if isinstance(block.content_json, dict) else ""
        for link_title in _extract_wikilinks(content):
            normalized = link_title.strip().lower()
            target = title_to_page.get(normalized) or slug_to_page.get(slugify(normalized))
            if not target:
                canonical = alias_map.get(normalized)
                if canonical:
                    target = title_to_page.get(canonical.lower()) or slug_to_page.get(slugify(canonical))
            if target:
                PageLink.objects.get_or_create(
                    from_page=page,
                    to_page=target,
                    link_text=link_title.strip(),
                    defaults={"context_block": block},
                )
    normalize_entities_for_page(page)


def _extract_source_text(request):
    source_text = str(request.data.get("text", "")).strip()
    if source_text:
        return source_text, "text"

    source_url = str(request.data.get("url", "")).strip()
    if source_url:
        try:
            content = requests.get(source_url, timeout=15).text
            cleaned = re.sub(r"<[^>]+>", " ", content)
            return re.sub(r"\s+", " ", cleaned).strip()[:30000], "url"
        except Exception:
            return "", "url"

    if "file" in request.FILES:
        try:
            uploaded = request.FILES["file"]
            raw = uploaded.read()
            return raw.decode("utf-8", errors="ignore"), "file"
        except Exception:
            return "", "file"

    return "", "unknown"


def _text_to_blocks(text, start_idx=0):
    blocks = []
    idx = start_idx
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        block_type = "paragraph"
        block_text = stripped
        if stripped.startswith("#"):
            block_type = "heading"
            block_text = stripped.lstrip("#").strip()
        elif stripped.startswith("- "):
            block_type = "bullet"
            block_text = stripped[2:].strip()
        elif stripped.startswith(">"):
            block_type = "quote"
            block_text = stripped.lstrip(">").strip()
        blocks.append({"block_type": block_type, "content_json": {"text": block_text}, "order_index": idx})
        idx += 1
    return blocks


def _infer_topic_name(title: str, text: str = "", tags=None) -> str:
    haystack = " ".join([title or "", text or "", " ".join(tags or [])]).lower()
    rules = [
        ("AI Research", ["ai", "llm", "agent", "model", "prompt", "embedding", "vector", "rag"]),
        ("Math", ["math", "algebra", "vector", "equation", "calculus", "geometry", "probability"]),
        ("Startup", ["startup", "mvp", "go-to-market", "gtm", "pricing", "customer", "market", "saas"]),
        ("Engineering", ["api", "backend", "frontend", "django", "next", "react", "architecture", "database"]),
        ("Business", ["finance", "revenue", "cost", "sales", "invoice", "tax", "profit", "budget"]),
        ("Personal", ["journal", "personal", "habit", "goal", "daily", "reflection"]),
    ]
    for topic, keywords in rules:
        if any(keyword in haystack for keyword in keywords):
            return topic
    return "Uncategorized"


def _assign_topic_if_missing(page: WorkspacePage, text: str = ""):
    if page.topic_id:
        return
    topic_name = _infer_topic_name(page.title, text, page.tags or [])
    topic, _ = Topic.objects.get_or_create(name=topic_name)
    page.topic = topic
    page.save(update_fields=["topic", "updated_at"])


@api_view(["GET", "POST"])
def pages_collection(request):
    if request.method == "GET":
        sync_wiki_to_db()
        topic_id = request.query_params.get("topic")
        subtopic_id = request.query_params.get("subtopic")
        query = str(request.query_params.get("q", "")).strip().lower()
        favorites = str(request.query_params.get("favorites", "")).lower() == "true"

        # 1. Fetch all active DB pages
        db_pages = WorkspacePage.objects.select_related("topic", "subtopic").filter(status="active")
        
        # 2. Filter in memory for performance and flexibility
        results = []
        for p in db_pages:
            if query and query not in p.title.lower() and query not in p.slug.lower():
                continue
            if topic_id and str(p.topic_id or "") != str(topic_id):
                continue
            if subtopic_id and str(p.subtopic_id or "") != str(subtopic_id):
                continue
            if favorites and not p.is_favorite:
                continue
            
            # Ensure topic exists for serialized payload
            if not p.topic_id:
                _assign_topic_if_missing(p)
            
            results.append(_serialize_page(p))

        results.sort(key=lambda x: x.get("title", "").lower())
        return Response({"pages": results})

    title = str(request.data.get("title", "")).strip()
    if not title:
        return Response({"error": "title is required"}, status=400)

    slug = slugify(request.data.get("slug") or title)[:220]
    if WorkspacePage.objects.filter(slug=slug).exists():
        slug = f"{slug}-{int(datetime.utcnow().timestamp())}"

    topic_id = request.data.get("topic_id")
    subtopic_id = request.data.get("subtopic_id")
    tags = request.data.get("tags", [])
    page = WorkspacePage.objects.create(
        slug=slug,
        title=title,
        icon=str(request.data.get("icon", "")),
        cover=str(request.data.get("cover", "")),
        last_edited_by=str(request.data.get("author", "Local User")),
        topic_id=topic_id if topic_id else None,
        subtopic_id=subtopic_id if subtopic_id else None,
        tags=tags if isinstance(tags, list) else [],
        description=str(request.data.get("description", "")),
        page_type=str(request.data.get("page_type", "note")),
        visibility=str(request.data.get("visibility", "private")),
        publish_state=str(request.data.get("publish_state", "draft")),
        is_favorite=bool(request.data.get("is_favorite", False)),
    )
    PageBlock.objects.create(page=page, block_type="paragraph", content_json={"text": ""}, order_index=0)
    _assign_topic_if_missing(page)
    write_page_to_file(page)
    return Response({"page": _serialize_page(page, include_blocks=True)}, status=201)


@api_view(["GET"])
def wiki_markdown_files(request):
    """
    Returns markdown files discovered under workspace/wiki as selectable pages.
    Uses the real file names from disk for picker display.
    """
    query = str(request.query_params.get("q", "")).strip().lower()

    pages = []
    for md_file in markdown_page_paths():
        file_name = md_file.name
        file_stem = md_file.stem
        source_path = str(md_file)
        title_from_file = file_stem.replace("_", " ")

        if query and query not in file_name.lower() and query not in title_from_file.lower():
            continue

        page = WorkspacePage.objects.filter(source_path=source_path).first()
        if not page:
            base_slug = slugify(file_stem)[:210] or f"md-{int(datetime.utcnow().timestamp())}"
            slug = base_slug
            idx = 2
            while WorkspacePage.objects.filter(slug=slug).exclude(source_path=source_path).exists():
                slug = f"{base_slug}-{idx}"
                idx += 1
            page = WorkspacePage.objects.create(
                slug=slug,
                title=title_from_file,
                source_path=source_path,
                page_type="markdown",
                status="active",
            )

        pages.append(
            {
                "id": page.id,
                "slug": page.slug,
                "title": title_from_file,
                "filename": file_name,
                "updated_at": datetime.utcfromtimestamp(md_file.stat().st_mtime).isoformat(),
                "is_favorite": page.is_favorite,
                "page_type": page.page_type or "markdown",
                "tags": page.tags or [],
            }
        )

    pages.sort(key=lambda p: p.get("filename", "").lower())
    return Response({"pages": pages})


@api_view(["GET", "PATCH", "DELETE"])
def page_detail(request, page_id):
    try:
        page = WorkspacePage.objects.select_related("topic", "subtopic").get(id=page_id)
    except WorkspacePage.DoesNotExist:
        return Response({"error": "page not found"}, status=404)

    if request.method == "GET":
        return Response({"page": _serialize_page(page, include_blocks=True)})

    if request.method == "DELETE":
        page.status = "archived"
        page.save(update_fields=["status", "updated_at"])
        archive_page_file(page)
        return Response({"status": "archived"})

    client_updated_at = str(request.data.get("updated_at", "")).strip()
    if client_updated_at and client_updated_at != page.updated_at.isoformat():
        return Response({"error": "conflict", "message": "Page has changed. Refresh and retry."}, status=409)

    page.title = str(request.data.get("title", page.title))
    page.icon = str(request.data.get("icon", page.icon))
    page.cover = str(request.data.get("cover", page.cover))
    page.last_edited_by = str(request.data.get("author", page.last_edited_by))
    if "topic_id" in request.data:
        page.topic_id = request.data.get("topic_id") or None
    if "subtopic_id" in request.data:
        page.subtopic_id = request.data.get("subtopic_id") or None
    if "tags" in request.data and isinstance(request.data.get("tags"), list):
        page.tags = request.data.get("tags")
    if "description" in request.data:
        page.description = str(request.data.get("description", ""))
    if "page_type" in request.data:
        page.page_type = str(request.data.get("page_type", page.page_type))
    if "visibility" in request.data:
        page.visibility = str(request.data.get("visibility", page.visibility))
    if "publish_state" in request.data:
        page.publish_state = str(request.data.get("publish_state", page.publish_state))
    if "is_favorite" in request.data:
        page.is_favorite = bool(request.data.get("is_favorite"))
    page.version = page.version + 1
    page.save()
    write_page_to_file(page)
    return Response({"page": _serialize_page(page)})


@api_view(["GET", "POST", "PATCH", "DELETE"])
def page_blocks(request, page_id):
    try:
        page = WorkspacePage.objects.get(id=page_id)
    except WorkspacePage.DoesNotExist:
        return Response({"error": "page not found"}, status=404)

    if request.method == "GET":
        return Response({"blocks": [_serialize_block(b) for b in page.blocks.all()]})

    if request.method == "POST":
        block_type = str(request.data.get("block_type", "paragraph"))
        content_json = request.data.get("content_json", {"text": ""})
        order_index = int(request.data.get("order_index", page.blocks.count()))
        block = PageBlock.objects.create(
            page=page,
            parent_block_id=request.data.get("parent_block_id"),
            block_type=block_type,
            content_json=content_json if isinstance(content_json, dict) else {"text": str(content_json)},
            order_index=order_index,
        )
        _refresh_page_links(page)
        write_page_to_file(page)
        return Response({"block": _serialize_block(block)}, status=201)

    if request.method == "DELETE":
        block_id = request.data.get("block_id")
        deleted, _ = PageBlock.objects.filter(page=page, id=block_id).delete()
        _refresh_page_links(page)
        write_page_to_file(page)
        return Response({"deleted": deleted})

    block_id = request.data.get("block_id")
    if not block_id:
        return Response({"error": "block_id is required"}, status=400)

    try:
        block = PageBlock.objects.get(page=page, id=block_id)
    except PageBlock.DoesNotExist:
        return Response({"error": "block not found"}, status=404)

    if request.data.get("reorder"):
        order = request.data.get("order", [])
        if not isinstance(order, list):
            return Response({"error": "order must be list of block IDs"}, status=400)
        with transaction.atomic():
            for idx, bid in enumerate(order):
                PageBlock.objects.filter(page=page, id=bid).update(order_index=idx)
        write_page_to_file(page)
        return Response({"status": "reordered"})

    content_json = request.data.get("content_json")
    if isinstance(content_json, dict):
        block.content_json = content_json
    if "block_type" in request.data:
        block.block_type = str(request.data.get("block_type"))
    if "order_index" in request.data:
        block.order_index = int(request.data.get("order_index"))
    block.save()
    _refresh_page_links(page)
    write_page_to_file(page)
    return Response({"block": _serialize_block(block)})


@api_view(["GET"])
def page_links(request, page_id):
    links = PageLink.objects.filter(from_page_id=page_id).select_related("to_page")
    return Response(
        {
            "links": [
                {
                    "id": l.id,
                    "to_page_id": l.to_page_id,
                    "to_page_title": l.to_page.title,
                    "to_page_slug": l.to_page.slug,
                    "link_text": l.link_text,
                    "context_block_id": l.context_block_id,
                }
                for l in links
            ]
        }
    )


@api_view(["GET"])
def page_backlinks(request, page_id):
    links = PageLink.objects.filter(to_page_id=page_id).select_related("from_page")
    return Response(
        {
            "backlinks": [
                {
                    "id": l.id,
                    "from_page_id": l.from_page_id,
                    "from_page_title": l.from_page.title,
                    "from_page_slug": l.from_page.slug,
                    "link_text": l.link_text,
                }
                for l in links
            ]
        }
    )


@api_view(["GET", "POST"])
def page_revisions(request, page_id):
    try:
        page = WorkspacePage.objects.get(id=page_id)
    except WorkspacePage.DoesNotExist:
        return Response({"error": "page not found"}, status=404)

    if request.method == "GET":
        return Response(
            {
                "revisions": [
                    {
                        "id": rev.id,
                        "summary": rev.summary,
                        "author": rev.author,
                        "created_at": rev.created_at.isoformat(),
                    }
                    for rev in page.revisions.all()[:30]
                ]
            }
        )

    summary = str(request.data.get("summary", "Manual revision")).strip() or "Manual revision"
    blocks = [_serialize_block(b) for b in page.blocks.all()]
    rev = PageRevision.objects.create(
        page=page,
        summary=summary,
        author=str(request.data.get("author", "Local User")),
        snapshot_json={"page": _serialize_page(page), "blocks": blocks},
    )
    return Response({"revision_id": rev.id}, status=201)


@api_view(["GET"])
def topics_collection(request):
    topics = Topic.objects.all().order_by("name")
    return Response(
        {
            "topics": [
                {
                    "id": topic.id,
                    "name": topic.name,
                    "icon": topic.icon,
                    "description": topic.description,
                }
                for topic in topics
            ]
        }
    )


@api_view(["GET"])
def subtopics_for_topic(request, topic_id):
    subtopics = Subtopic.objects.filter(topic_id=topic_id).order_by("name")
    return Response({"subtopics": [{"id": s.id, "topic_id": s.topic_id, "name": s.name} for s in subtopics]})




@api_view(["POST"])
def ingest_page_to_knowledge(request, page_id):
    try:
        page = WorkspacePage.objects.get(id=page_id)
    except WorkspacePage.DoesNotExist:
        return Response({"error": "page not found"}, status=404)
    page.ingestion_status = "processing"
    page.save(update_fields=["ingestion_status", "updated_at"])
    # Lightweight local-first status update; downstream indexing jobs can consume this state.
    page.ingestion_status = "indexed"
    page.save(update_fields=["ingestion_status", "updated_at"])
    return Response({"status": "indexed", "page_id": page_id})


@api_view(["POST"])
def restore_revision(request, page_id, revision_id):
    try:
        page = WorkspacePage.objects.get(id=page_id)
        revision = PageRevision.objects.get(id=revision_id, page=page)
    except (WorkspacePage.DoesNotExist, PageRevision.DoesNotExist):
        return Response({"error": "revision not found"}, status=404)

    snapshot = revision.snapshot_json or {}
    blocks = snapshot.get("blocks", [])
    with transaction.atomic():
        page.blocks.all().delete()
        for idx, block in enumerate(blocks):
            PageBlock.objects.create(
                page=page,
                parent_block_id=block.get("parent_block_id"),
                block_type=block.get("block_type", "paragraph"),
                content_json=block.get("content_json", {"text": ""}),
                order_index=idx,
            )
    _refresh_page_links(page)
    write_page_to_file(page)
    return Response({"status": "restored", "revision_id": revision_id})


@api_view(["GET"])
def search_pages(request):
    sync_wiki_to_db()
    q = str(request.query_params.get("q", "")).strip()
    qs = WorkspacePage.objects.filter(status="active")
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(slug__icontains=q))
    return Response({"pages": [_serialize_page(p) for p in qs[:50]]})


@api_view(["GET"])
def recent_pages(request):
    sync_wiki_to_db()
    pages = WorkspacePage.objects.filter(status="active").order_by("-updated_at")[:25]
    return Response({"pages": [_serialize_page(p) for p in pages]})


@api_view(["GET"])
def knowledge_graph(request):
    sync_wiki_to_db()
    pages = list(WorkspacePage.objects.filter(status="active"))
    for page in pages:
        if not page.topic_id:
            first_block = page.blocks.order_by("order_index").first()
            sample_text = ""
            if first_block and isinstance(first_block.content_json, dict):
                sample_text = str(first_block.content_json.get("text", ""))
            _assign_topic_if_missing(page, text=sample_text)
    links = list(PageLink.objects.select_related("from_page", "to_page"))
    degree = {p.slug: 0 for p in pages}
    edge_payload = []
    for link in links:
        source = link.from_page.slug
        target = link.to_page.slug
        degree[source] = degree.get(source, 0) + 1
        degree[target] = degree.get(target, 0) + 1
        edge_payload.append({"source": source, "target": target, "type": "wikilink"})

    # Add lightweight inferred relationships by shared topic/subtopic/tags.
    # This makes the graph useful even before many explicit wikilinks exist.
    pages_by_topic = defaultdict(list)
    pages_by_subtopic = defaultdict(list)
    pages_by_tag = defaultdict(list)
    for page in pages:
        if page.topic_id:
            pages_by_topic[page.topic_id].append(page)
        if page.subtopic_id:
            pages_by_subtopic[page.subtopic_id].append(page)
        for tag in (page.tags or []):
            tag_key = str(tag).strip().lower()
            if tag_key:
                pages_by_tag[tag_key].append(page)

    def _add_inferred(grouped_pages, relation_type):
        for _, grouped in grouped_pages.items():
            if len(grouped) < 2:
                continue
            for idx in range(len(grouped)):
                for jdx in range(idx + 1, len(grouped)):
                    source = grouped[idx].slug
                    target = grouped[jdx].slug
                    degree[source] = degree.get(source, 0) + 1
                    degree[target] = degree.get(target, 0) + 1
                    edge_payload.append({"source": source, "target": target, "type": relation_type})

    _add_inferred(pages_by_topic, "topic_relation")
    _add_inferred(pages_by_subtopic, "subtopic_relation")
    _add_inferred(pages_by_tag, "tag_relation")

    # Add semantic title-overlap relationships for disconnected graphs.
    # This is a lightweight fallback when explicit wikilinks are sparse.
    def _tokenize(value: str):
        return {t for t in re.findall(r"[a-z0-9]+", (value or "").lower()) if len(t) > 2}

    semantic_edges = set()
    title_tokens = {p.slug: _tokenize(p.title) for p in pages}
    for idx in range(len(pages)):
        for jdx in range(idx + 1, len(pages)):
            p1 = pages[idx]
            p2 = pages[jdx]
            overlap = title_tokens.get(p1.slug, set()) & title_tokens.get(p2.slug, set())
            if len(overlap) >= 2:
                key = tuple(sorted([p1.slug, p2.slug]))
                if key in semantic_edges:
                    continue
                semantic_edges.add(key)
                degree[p1.slug] = degree.get(p1.slug, 0) + 1
                degree[p2.slug] = degree.get(p2.slug, 0) + 1
                edge_payload.append({"source": p1.slug, "target": p2.slug, "type": "semantic_relation"})

    nodes = []
    for page in pages:
        first_block = page.blocks.order_by("order_index").first()
        summary = ""
        if first_block and isinstance(first_block.content_json, dict):
            summary = str(first_block.content_json.get("text", ""))[:220]
        nodes.append(
            {
                "id": page.slug,
                "name": page.title,
                "type": "knowledge",
                "summary": summary,
                "degree": degree.get(page.slug, 0),
                "is_hub": degree.get(page.slug, 0) >= 3,
                "topic": page.topic.name if page.topic else "Uncategorized",
                "subtopic": page.subtopic.name if page.subtopic else "",
                "tags": page.tags or [],
            }
        )

    return Response(
        {
            "nodes": nodes,
            "links": edge_payload,
            "stats": {
                "node_count": len(nodes),
                "link_count": len(edge_payload),
                "ghost_count": 0,
                "hub_count": len([n for n in nodes if n.get("is_hub")]),
                "orphan_count": len([n for n in nodes if n.get("degree", 0) == 0]),
            },
            "meta": {"source": "knowledge", "revision": "v2"},
        }
    )


@api_view(["POST"])
def ingest_preview(request):
    text, source_type = _extract_source_text(request)
    if not text:
        return Response({"error": "No ingest source provided"}, status=400)
    blocks = _text_to_blocks(text)
    return Response({"source_type": source_type, "proposed_blocks": blocks[:50], "count": len(blocks)})


@api_view(["POST"])
def ingest_current_page(request):
    page_id = request.data.get("page_id")
    if not page_id:
        return Response({"error": "page_id is required"}, status=400)
    try:
        page = WorkspacePage.objects.get(id=page_id, status="active")
    except WorkspacePage.DoesNotExist:
        return Response({"error": "page not found"}, status=404)

    text, source_type = _extract_source_text(request)
    if not text:
        return Response({"error": "No ingest source provided"}, status=400)
    start_idx = page.blocks.count()
    proposed = _text_to_blocks(text, start_idx=start_idx)
    created = []
    with transaction.atomic():
        for block in proposed:
            created_block = PageBlock.objects.create(
                page=page,
                block_type=block["block_type"],
                content_json=block["content_json"],
                order_index=block["order_index"],
            )
            created.append(_serialize_block(created_block))
    _refresh_page_links(page)
    write_page_to_file(page)
    return Response({"status": "applied", "source_type": source_type, "created_blocks": created, "count": len(created)})


@api_view(["POST"])
def ingest_new_page(request):
    text, source_type = _extract_source_text(request)
    if not text:
        return Response({"error": "No ingest source provided"}, status=400)
    title = str(request.data.get("title", "")).strip() or f"Ingested {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
    slug = slugify(request.data.get("slug") or title)[:220]
    if WorkspacePage.objects.filter(slug=slug).exists():
        slug = f"{slug}-{int(datetime.utcnow().timestamp())}"
    page = WorkspacePage.objects.create(slug=slug, title=title, last_edited_by=str(request.data.get("author", "Local User")))
    proposed = _text_to_blocks(text)
    if not proposed:
        proposed = [{"block_type": "paragraph", "content_json": {"text": text[:3000]}, "order_index": 0}]
    with transaction.atomic():
        for block in proposed:
            PageBlock.objects.create(
                page=page,
                block_type=block["block_type"],
                content_json=block["content_json"],
                order_index=block["order_index"],
            )
    _assign_topic_if_missing(page, text=text[:5000])
    _refresh_page_links(page)
    write_page_to_file(page)
    return Response({"status": "applied", "source_type": source_type, "page": _serialize_page(page, include_blocks=True)}, status=201)


