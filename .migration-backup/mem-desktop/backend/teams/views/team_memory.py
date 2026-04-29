from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Team, TeamMembership
from .team_core import get_team_membership


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def team_memory(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    # Return team memory/context items
    pages = team.pages.all().order_by("-updated_at")[:50]
    data = [
        {
            "id": str(p.id),
            "title": p.title,
            "page_type": p.page_type,
            "updated_at": p.updated_at.isoformat(),
        }
        for p in pages
    ]
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_team_memory(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    # Store a memory entry (currently stored as a page)
    from ..models import TeamPage

    title = request.data.get("title", "Memory entry")
    content = request.data.get("content", {})
    memory_type = request.data.get("memory_type", "fact")

    page = TeamPage.objects.create(
        team=team,
        title=title,
        content_json=content,
        page_type="knowledge_node",
        created_by=request.user,
    )
    return Response({"id": str(page.id), "title": page.title}, status=status.HTTP_201_CREATED)
