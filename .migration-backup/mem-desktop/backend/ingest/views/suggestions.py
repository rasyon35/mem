from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils.text import slugify


@api_view(['GET'])
def get_suggestions(request):
    query = request.query_params.get("q", "")
    if not query:
        return Response({"suggestions": []})

    from ..semantic_index import semantic_index
    results = semantic_index.search(query, top_k=5)

    return Response({
        "suggestions": [
            {
                "title": r.get("title", ""),
                "slug": slugify(r.get("title", "")),
                "score": r.get("score", 0),
            }
            for r in results
        ]
    })


@api_view(['GET'])
def synthesize_hub(request):
    topic = request.query_params.get("topic", "")
    if not topic:
        return Response({"error": "topic required"}, status=status.HTTP_400_BAD_REQUEST)

    from ..semantic_index import semantic_index
    results = semantic_index.search(topic, top_k=10)

    return Response({
        "topic": topic,
        "synthesis": f"Synthesis of {topic} based on {len(results)} sources.",
        "sources": results[:5],
    })
