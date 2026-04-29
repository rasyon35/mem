from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from knowledge.models import WorkspacePage
from ..models import Team, TeamMembership, TeamPage
from ..serializers import TeamPageSerializer
from .team_core import get_team_membership


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def share_to_team(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    personal_page_id = request.data.get("page_id")
    if not personal_page_id:
        return Response({"error": "page_id required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        personal_page = WorkspacePage.objects.get(id=personal_page_id, user=request.user)
    except WorkspacePage.DoesNotExist:
        return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

    # Clone page to team
    team_page = TeamPage.objects.create(
        team=team,
        title=personal_page.title,
        content_json=personal_page.blocks_to_json() if hasattr(personal_page, 'blocks_to_json') else {},
        page_type=personal_page.page_type,
        created_by=request.user,
        source_page_id=personal_page.id,
    )

    return Response(TeamPageSerializer(team_page).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def fork_to_personal(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    team_page_id = request.data.get("page_id")
    if not team_page_id:
        return Response({"error": "page_id required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        team_page = TeamPage.objects.get(id=team_page_id, team=team)
    except TeamPage.DoesNotExist:
        return Response({"error": "Team page not found"}, status=status.HTTP_404_NOT_FOUND)

    # Fork to personal
    personal_page = WorkspacePage.objects.create(
        title=f"[Forked] {team_page.title}",
        description=f"Forked from team page: {team_page.title}",
        page_type=team_page.page_type,
        user=request.user,
        source_path="",
    )

    return Response({
        "success": True,
        "personal_page_id": personal_page.id,
        "message": "Page forked to personal workspace",
    })
