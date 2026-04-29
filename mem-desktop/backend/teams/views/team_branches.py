from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Team, TeamMembership, TeamBranch
from ..serializers import TeamBranchSerializer
from .team_core import get_team_membership


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def team_branches(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        branches = team.branches.all().order_by("-created_at")
        return Response(TeamBranchSerializer(branches, many=True).data)

    elif request.method == "POST":
        if membership.role not in ["owner", "editor"]:
            return Response({"error": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
        serializer = TeamBranchSerializer(data=request.data, context={"request": request, "team": team})
        if serializer.is_valid():
            branch = serializer.save()
            return Response(TeamBranchSerializer(branch).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def branch_action(request, team_id, branch_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
        branch = TeamBranch.objects.get(id=branch_id, team=team)
    except (Team.DoesNotExist, TeamBranch.DoesNotExist):
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    action = request.data.get("action")
    if action == "merge":
        if membership.role not in ["owner", "editor"]:
            return Response({"error": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
        branch.status = "merged"
        branch.save()
        return Response({"merged": True})
    elif action == "archive":
        branch.status = "archived"
        branch.save()
        return Response({"archived": True})
    elif action == "reopen":
        branch.status = "draft"
        branch.save()
        return Response({"reopened": True})

    return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
