import re
from datetime import datetime
from collections import defaultdict

from django.utils.text import slugify
from ..models import WorkspacePage, PageBlock, PageLink, Topic
from ..ontology import entity_alias_map, normalize_entities_for_page
from ..wiki_projection import archive_page_file, markdown_page_paths, sync_wiki_to_db, workspace_wiki_dir, write_page_to_file


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
            import requests
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
    from ..models import Topic
    topic_name = _infer_topic_name(page.title, text, page.tags or [])
    topic, _ = Topic.objects.get_or_create(name=topic_name)
    page.topic = topic
    page.save(update_fields=["topic", "updated_at"])
