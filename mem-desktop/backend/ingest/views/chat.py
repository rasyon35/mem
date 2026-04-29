from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import re
import json
import time

from ..models import Source, Contradiction, RawArtifactLedger
from ..ai_client import memos_ai as ai_client
from ..semantic_index import semantic_index
from knowledge.models import WorkspacePage, PageBlock
from .ingest_core import _persist_query_artifact


@api_view(["POST"])
def chat_query(request):
    query = request.data.get("query", "") or request.data.get("question", "")
    if not query:
        return Response({"error": "Query required"}, status=status.HTTP_400_BAD_REQUEST)

    context_pages = request.data.get("context_pages", [])
    page_context = request.data.get("page_context", "")
    surface = request.data.get("surface", "main")

    # Gather context from sources
    sources = Source.objects.filter(status="approved").order_by("-created_at")[:20]
    context_text = "\n\n".join([s.extracted_text[:2000] for s in sources if s.extracted_text])

    # Add semantic search
    semantic_results = semantic_index.search(query, top_k=5)
    semantic_context = "\n\n".join([r.get("text", "") for r in semantic_results])

    full_context = f"{context_text}\n\n{semantic_context}"

    # Get AI response
    response = ai_client.ask(
        query=query,
        context=full_context,
        page_context=page_context,
    )

    answer = response.get("answer", "")
    citations = response.get("citations", [])
    confidence = response.get("confidence", "medium")

    # Check for contradictions
    contradictions = Contradiction.objects.filter(resolved=False).order_by("-created_at")[:5]

    # Persist artifact
    artifact = _persist_query_artifact(query, answer, citations, confidence, page_context)

    _append_metric_event("chat_query", {"query_length": len(query), "artifact_id": str(artifact.id)})

    return Response({
        "answer": answer,
        "citations": citations,
        "confidence": confidence,
        "contradictions": [
            {
                "id": c.id,
                "text_a": c.text_a[:200],
                "text_b": c.text_b[:200],
                "reason": c.reason,
            }
            for c in contradictions
        ],
        "artifact_id": str(artifact.id),
    })


@api_view(["POST"])
def chat_with_context(request):
    query = request.data.get("query", "")
    node_ids = request.data.get("node_ids", [])
    if not query:
        return Response({"error": "Query required"}, status=status.HTTP_400_BAD_REQUEST)

    # Build context from graph nodes
    context_text = ""
    if node_ids:
        from ..graph_service import graph_service
        nodes = graph_service.get_nodes_by_ids(node_ids)
        context_text = "\n\n".join([n.get("content", "") for n in nodes])

    response = ai_client.ask(
        query=query,
        context=context_text,
    )

    return Response({
        "answer": response.get("answer", ""),
        "citations": response.get("citations", []),
        "confidence": response.get("confidence", "medium"),
    })
