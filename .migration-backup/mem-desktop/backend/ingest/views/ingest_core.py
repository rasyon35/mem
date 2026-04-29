from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import json
import re
import time
import hashlib
from pathlib import Path
from urllib.parse import urlparse
from django.conf import settings
from django.utils.text import slugify
from git import Repo

from ..extractors import TextExtractor
from ..processor import ingest_processor
from ..wiki_context import wiki_context
from ..ai_client import memos_ai as ai_client
from ..models import (
    Source,
    Contradiction,
    PageSource,
    RawArtifactLedger,
)
from ..semantic_index import semantic_index
from knowledge.models import WorkspacePage, PageBlock
from knowledge.wiki_projection import write_page_to_file, sync_wiki_to_db


WORKSPACE_ROOT = Path(settings.WORKSPACE_ROOT)
WORKSPACE_WIKI_DIR = Path(settings.WORKSPACE_WIKI_DIR)
WORKSPACE_RAW_DIR = Path(settings.WORKSPACE_RAW_DIR)


def _artifact_slug(question: str):
    base = slugify(question[:80]) or f"analysis-{int(time.time())}"
    return f"analysis-{base}-{int(time.time())}"


def _persist_query_artifact(question: str, answer: str, citations: list, confidence: str, page_context: str = ""):
    slug = _artifact_slug(question)
    title = f"Analysis {time.strftime('%Y-%m-%d %H:%M')}"
    page, _ = WorkspacePage.objects.get_or_create(
        slug=slug,
        defaults={
            "title": title,
            "description": "Auto-saved from query response.",
            "page_type": "analysis",
            "status": "active",
        },
    )
    page.blocks.all().delete()
    PageBlock.objects.create(page=page, block_type="heading", content_json={"text": title}, order_index=0)
    PageBlock.objects.create(page=page, block_type="paragraph", content_json={"text": answer}, order_index=1)
    write_page_to_file(page)
    from .models import QueryArtifact, ArtifactRevision

    artifact = QueryArtifact.objects.create(
        query_text=question,
        page_context=page_context,
        artifact_slug=slug,
        artifact_title=title,
        confidence=confidence,
        citations_json=citations,
        is_active=True,
    )
    ArtifactRevision.objects.create(
        artifact=artifact,
        content=answer,
        note="initial auto-compounded answer",
    )
    return artifact


def _append_metric_event(event_name, payload=None):
    """Append KPI/telemetry event to local workspace metrics log."""
    metrics_dir = WORKSPACE_ROOT / "_metrics"
    metrics_dir.mkdir(parents=True, exist_ok=True)
    events_file = metrics_dir / "events.jsonl"
    event = {
        "event": event_name,
        "timestamp": time.time(),
    }
    if payload:
        event["payload"] = payload
    with open(events_file, "a") as f:
        f.write(json.dumps(event) + "\n")


@api_view(["POST"])
def ingest_file(request):
    uploaded = request.FILES.get("file")
    if not uploaded:
        return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

    raw_dir = WORKSPACE_RAW_DIR
    raw_dir.mkdir(parents=True, exist_ok=True)
    dest = raw_dir / uploaded.name
    with open(dest, "wb") as f:
        for chunk in uploaded.chunks():
            f.write(chunk)

    extractor = TextExtractor()
    text, meta = extractor.extract(dest)

    result = ingest_processor.ingest_text(
        text=text,
        source_name=uploaded.name,
        source_type=meta.get("source_type", "upload"),
        user=request.user,
    )

    _append_metric_event("file_ingested", {"filename": uploaded.name, "source_id": result.get("source_id")})

    return Response({
        "text": text[:2000],
        "meta": meta,
        "source_id": result.get("source_id"),
        "entities": result.get("entities", []),
        "contradictions": result.get("contradictions", []),
    })


@api_view(["POST"])
def ingest_text(request):
    text = request.data.get("text", "")
    source_name = request.data.get("source_name", "pasted-text")
    if not text:
        return Response({"error": "No text provided"}, status=status.HTTP_400_BAD_REQUEST)

    result = ingest_processor.ingest_text(
        text=text,
        source_name=source_name,
        source_type="paste",
        user=request.user,
        page_context=request.data.get("page_context"),
    )

    _append_metric_event("text_ingested", {"source_id": result.get("source_id")})

    return Response({
        "source_id": result.get("source_id"),
        "entities": result.get("entities", []),
        "contradictions": result.get("contradictions", []),
    })


@api_view(["POST"])
def approve_changes(request):
    source_id = request.data.get("source_id")
    if not source_id:
        return Response({"error": "source_id required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        source = Source.objects.get(id=source_id)
        source.status = "approved"
        source.save()
        return Response({"approved": True})
    except Source.DoesNotExist:
        return Response({"error": "Source not found"}, status=status.HTTP_404_NOT_FOUND)
