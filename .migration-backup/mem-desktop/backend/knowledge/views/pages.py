from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.utils.text import slugify

from .helpers import _serialize_page, _serialize_block, _assign_topic_if_missing, _refresh_page_links, write_page_to_file
from ..models import WorkspacePage, PageBlock, PageLink, PageRevision
from ..wiki_projection import sync_wiki_to_db


@api_view(["GET", "POST"])
def pages_collection(request):
    if request.method == "GET":
        sync_wiki_to_db()
        topic_id = request.query_params.get("topic")
        subtopic_id = request.query_params.get("subtopic")
        query = str(request.query_params.get("q", "")).strip().lower()
        favorites = str(request.query_params.get("favorites", "")).lower() == "true"

        db_pages = WorkspacePage.objects.select_related("topic", "subtopic").filter(status="active")

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
            if not p.topic_id:
                _assign_topic_if_missing(p)
            results.append(_serialize_page(p))

        results.sort(key=lambda x: x.get("title", "").lower())
        return Response({"pages": results})

    # POST - create new page
    title = str(request.data.get("title", "")).strip()
    if not title:
        return Response({"error": "title is required"}, status=400)

    slug = slugify(request.data.get("slug") or title)[:220]
    if WorkspacePage.objects.filter(slug=slug).exists():
        slug = f"{slug}-{int(datetime.utcnow().timestamp())}"

    from datetime import datetime
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


@api_view(["GET", "PATCH", "DELETE"])
def page_detail(request, page_id):
    from datetime import datetime
    try:
        page = WorkspacePage.objects.select_related("topic", "subtopic").get(id=page_id)
    except WorkspacePage.DoesNotExist:
        return Response({"error": "page not found"}, status=404)

    if request.method == "GET":
        return Response({"page": _serialize_page(page, include_blocks=True)})

    if request.method == "DELETE":
        page.status = "archived"
        page.save(update_fields=["status", "updated_at"])
        from ..wiki_projection import archive_page_file
        archive_page_file(page)
        return Response({"status": "archived"})

    # PATCH
    client_updated_at = str(request.data.get("updated_at", "")).strip()
    if client_updated_at and client_updated_at != page.updated_at.isoformat():
        return Response({"error": "conflict", "message": "Page has changed. Refresh and retry."}, status=409)

    page.title = str(request.data.get("title", page.title))
    page.icon = str(request.data.get("icon", page.icon))
    page.cover = str(request.data.get("cover", page.cover))
    page.last_edited_by = str(request.data.get("author", page.last_edited_by))
    if "topic_id" in request.data:
        page.topic_id = request.data["topic_id"] or None
    if "subtopic_id" in request.data:
        page.subtopic_id = request.data["subtopic_id"] or None
    if "tags" in request.data:
        page.tags = request.data["tags"] if isinstance(request.data["tags"], list) else []
    page.description = str(request.data.get("description", page.description))
    page.page_type = str(request.data.get("page_type", page.page_type))
    page.visibility = str(request.data.get("visibility", page.visibility))
    page.publish_state = str(request.data.get("publish_state", page.publish_state))
    page.is_favorite = bool(request.data.get("is_favorite", page.is_favorite))
    page.save()
    write_page_to_file(page)
    return Response({"page": _serialize_page(page, include_blocks=True)})


@api_view(["GET", "POST", "PATCH", "DELETE"])
def page_blocks(request, page_id):
    try:
        page = WorkspacePage.objects.get(id=page_id)
    except WorkspacePage.DoesNotExist:
        return Response({"error": "page not found"}, status=404)

    if request.method == "GET":
        blocks = page.blocks.all().order_by("order_index")
        return Response({"blocks": [_serialize_block(b) for b in blocks]})

    if request.method == "POST":
        block_type = request.data.get("block_type", "paragraph")
        content_json = request.data.get("content_json", {})
        order_index = request.data.get("order_index", page.blocks.count())
        block = PageBlock.objects.create(
            page=page,
            block_type=block_type,
            content_json=content_json,
            order_index=order_index,
        )
        page.save(update_fields=["updated_at"])
        write_page_to_file(page)
        return Response({"block": _serialize_block(block)}, status=201)

    if request.method == "PATCH":
        block_id = request.data.get("block_id")
        try:
            block = PageBlock.objects.get(id=block_id, page=page)
        except PageBlock.DoesNotExist:
            return Response({"error": "block not found"}, status=404)
        if "content_json" in request.data:
            block.content_json = request.data["content_json"]
        if "block_type" in request.data:
            block.block_type = request.data["block_type"]
        block.save()
        page.save(update_fields=["updated_at"])
        write_page_to_file(page)
        return Response({"block": _serialize_block(block)})

    if request.method == "DELETE":
        block_id = request.data.get("block_id")
        PageBlock.objects.filter(id=block_id, page=page).delete()
        page.save(update_fields=["updated_at"])
        write_page_to_file(page)
        return Response({"deleted": True})


@api_view(["GET"])
def page_links(request, page_id):
    try:
        page = WorkspacePage.objects.get(id=page_id)
    except WorkspacePage.DoesNotExist:
        return Response({"error": "page not found"}, status=404)
    links = page.links_from.all().select_related("to_page")
    return Response({
        "links": [
            {
                "id": l.id,
                "to_page_id": l.to_page_id,
                "to_page_title": l.to_page.title,
                "link_text": l.link_text,
            }
            for l in links
        ]
    })


@api_view(["GET"])
def page_backlinks(request, page_id):
    try:
        page = WorkspacePage.objects.get(id=page_id)
    except WorkspacePage.DoesNotExist:
        return Response({"error": "page not found"}, status=404)
    backlinks = page.links_to.all().select_related("from_page")
    return Response({
        "backlinks": [
            {
                "id": l.id,
                "from_page_id": l.from_page_id,
                "from_page_title": l.from_page.title,
                "link_text": l.link_text,
            }
            for l in backlinks
        ]
    })


@api_view(["GET", "POST"])
def page_revisions(request, page_id):
    try:
        page = WorkspacePage.objects.get(id=page_id)
    except WorkspacePage.DoesNotExist:
        return Response({"error": "page not found"}, status=404)

    if request.method == "GET":
        revisions = page.revisions.all().order_by("-created_at")[:20]
        return Response({
            "revisions": [
                {
                    "id": r.id,
                    "editor": r.editor,
                    "note": r.note,
                    "created_at": r.created_at.isoformat(),
                }
                for r in revisions
            ]
        })

    if request.method == "POST":
        note = request.data.get("note", "Manual revision")
        blocks_data = [{"block_type": b.block_type, "content_json": b.content_json} for b in page.blocks.all()]
        revision = PageRevision.objects.create(
            page=page,
            editor=request.data.get("editor", "Local User"),
            content_snapshot={"blocks": blocks_data},
            note=note,
            summary=note,
        )
        return Response({
            "revision_id": revision.id,
            "created_at": revision.created_at.isoformat(),
        }, status=201)


@api_view(["GET"])
def search_pages(request):
    query = str(request.query_params.get("q", "")).strip().lower()
    if not query:
        return Response({"pages": []})
    pages = WorkspacePage.objects.filter(
        Q(title__icontains=query) | Q(slug__icontains=query),
        status="active",
    )[:20]
    return Response({"pages": [_serialize_page(p) for p in pages]})


@api_view(["GET"])
def recent_pages(request):
    pages = WorkspacePage.objects.filter(status="active").order_by("-updated_at")[:20]
    return Response({"pages": [_serialize_page(p) for p in pages]})
