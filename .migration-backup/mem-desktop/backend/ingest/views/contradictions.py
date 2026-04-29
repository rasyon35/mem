from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from ..models import Contradiction


@api_view(["GET", "PATCH"])
def list_contradictions(request):
    resolved_filter = request.query_params.get("resolved", "false")
    queryset = Contradiction.objects.all().order_by("-created_at")
    if resolved_filter == "false":
        queryset = queryset.filter(resolved=False)
    elif resolved_filter == "true":
        queryset = queryset.filter(resolved=True)

    return Response([
        {
            "id": str(c.id),
            "text_a": c.text_a[:200],
            "text_b": c.text_b[:200],
            "reason": c.reason,
            "resolved": c.resolved,
            "created_at": c.created_at.isoformat(),
        }
        for c in queryset[:50]
    ])
