from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from ..models import Source


@api_view(["GET"])
def manage_sources(request):
    status_filter = request.query_params.get("status")
    sources = Source.objects.all().order_by("-created_at")
    if status_filter:
        sources = sources.filter(status=status_filter)
    return Response([
        {
            "id": str(s.id),
            "name": s.name,
            "source_type": s.source_type,
            "status": s.status,
            "created_at": s.created_at.isoformat(),
        }
        for s in sources[:50]
    ])


@api_view(["GET"])
def get_setup_status(request):
    return Response({
        "workspace_initialized": True,
        "git_configured": True,
        "ai_configured": True,
    })


@api_view(["POST"])
def setup_activate(request):
    return Response({"activated": True})
