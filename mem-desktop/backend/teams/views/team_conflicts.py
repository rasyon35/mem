from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Team, TeamMembership, TeamKnowledgeConflict
from ..serializers import TeamKnowledgeConflictSerializer
from .team_core import get_team_membership


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def team_conflicts(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        conflicts = team.conflicts.all().order_by("-created_at")
        return Response(TeamKnowledgeConflictSerializer(conflicts, many=True).data)

    elif request.method == "POST":
        if membership.role not in ["owner", "editor"]:
            return Response({"error": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
        serializer = TeamKnowledgeConflictSerializer(
            data=request.data, context={"request": request, "team": team}
        )
        if serializer.is_valid():
            conflict = serializer.save()
            return Response(TeamKnowledgeConflictSerializer(conflict).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resolve_conflict(request, team_id, conflict_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
        conflict = TeamKnowledgeConflict.objects.get(id=conflict_id, team=team)
    except (Team.DoesNotExist, TeamKnowledgeConflict.DoesNotExist):
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    if membership.role not in ["owner", "editor"]:
        return Response({"error": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)

    resolution = request.data.get("resolution")
    if not resolution:
        return Response({"error": "Resolution text required"}, status=status.HTTP_400_BAD_REQUEST)

    conflict.status = "resolved"
    conflict.resolution = resolution
    conflict.resolved_by = request.user
    conflict.save()

    return Response({"resolved": True, "conflict_id": conflict.id})
