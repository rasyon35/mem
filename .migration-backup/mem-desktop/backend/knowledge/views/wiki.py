from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils.text import slugify
from datetime import datetime

from .helpers import _serialize_page, _assign_topic_if_missing, _extract_source_text, _text_to_blocks
from ..models import WorkspacePage, PageBlock
from ..wiki_projection import write_page_to_file, sync_wiki_to_db, markdown_page_paths


@api_view(["GET"])
def wiki_markdown_files(request):
    query = str(request.query_params.get("q", "")).strip().lower()
    pages = []
    seen_ids = set()
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
        if page.id in seen_ids:
            continue
        seen_ids.add(page.id)
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


@api_view(["POST"])
def ingest_page_to_knowledge(request, page_id):
    try:
        page = WorkspacePage.objects.get(id=page_id)
    except WorkspacePage.DoesNotExist:
        return Response({"error": "page not found"}, status=404)
    text, source_type = _extract_source_text(request)
    if not text:
        return Response({"error": "No content provided"}, status=400)
    blocks = _text_to_blocks(text)
    for block in blocks:
        PageBlock.objects.create(
            page=page,
            block_type=block["block_type"],
            content_json=block["content_json"],
            order_index=block["order_index"]
        )
    page.ingestion_status = "processed"
    page.save(update_fields=["ingestion_status", "updated_at"])
    write_page_to_file(page)
    return Response({"blocks_added": len(blocks)})


@api_view(["POST"])
def ingest_preview(request):
    text, source_type = _extract_source_text(request)
    if not text:
        return Response({"error": "No content provided"}, status=400)
    blocks = _text_to_blocks(text)
    return Response({"blocks": blocks, "source_type": source_type})


@api_view(["POST"])
def ingest_current_page(request):
    page_id = request.data.get("page_id")
    if not page_id:
        return Response({"error": "page_id required"}, status=400)
    try:
        page = WorkspacePage.objects.get(id=page_id)
    except WorkspacePage.DoesNotExist:
        return Response({"error": "page not found"}, status=404)
    text, source_type = _extract_source_text(request)
    if not text:
        return Response({"error": "No content provided"}, status=400)
    blocks = _text_to_blocks(text)
    for block in blocks:
        PageBlock.objects.create(
            page=page,
            block_type=block["block_type"],
            content_json=block["content_json"],
            order_index=block["order_index"]
        )
    page.ingestion_status = "processed"
    page.save(update_fields=["ingestion_status", "updated_at"])
    write_page_to_file(page)
    return Response({"blocks_added": len(blocks)})


@api_view(["POST"])
def ingest_new_page(request):
    text, source_type = _extract_source_text(request)
    if not text:
        return Response({"error": "No content provided"}, status=400)
    title = str(request.data.get("title", "New Page")).strip()
    slug = slugify(title)[:220]
    if WorkspacePage.objects.filter(slug=slug).exists():
        slug = f"{slug}-{int(datetime.utcnow().timestamp())}"
    page = WorkspacePage.objects.create(
        slug=slug,
        title=title,
        page_type="note",
        status="active",
    )
    blocks = _text_to_blocks(text)
    for block in blocks:
        PageBlock.objects.create(
            page=page,
            block_type=block["block_type"],
            content_json=block["content_json"],
            order_index=block["order_index"]
        )
    page.ingestion_status = "processed"
    page.save(update_fields=["ingestion_status", "updated_at"])
    _assign_topic_if_missing(page)
    write_page_to_file(page)
    return Response({"page": _serialize_page(page, include_blocks=True)}, status=201)


@api_view(["POST"])
def restore_revision(request, page_id, revision_id):
    try:
        page = WorkspacePage.objects.get(id=page_id)
    except WorkspacePage.DoesNotExist:
        return Response({"error": "page not found"}, status=404)
    from ..models import PageRevision
    try:
        revision = PageRevision.objects.get(id=revision_id, page=page)
    except PageRevision.DoesNotExist:
        return Response({"error": "revision not found"}, status=404)
    page.blocks.all().delete()
    snapshot = revision.content_snapshot
    if isinstance(snapshot, dict) and "blocks" in snapshot:
        for block_data in snapshot["blocks"]:
            PageBlock.objects.create(
                page=page,
                block_type=block_data.get("block_type", "paragraph"),
                content_json=block_data.get("content_json", {}),
                order_index=block_data.get("order_index", 0),
            )
    page.save(update_fields=["updated_at"])
    write_page_to_file(page)
    return Response({"restored": True, "revision_id": revision_id})
