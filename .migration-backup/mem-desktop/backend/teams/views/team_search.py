from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Team, TeamPage
from ..serializers import TeamPageSerializer
from .team_core import get_team_membership


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search_team(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    query = request.query_params.get("q", "").strip()
    if not query:
        return Response([])

    pages = TeamPage.objects.filter(team=team, title__icontains=query)[:20]
    serializer = TeamPageSerializer(pages, many=True)
    return Response(serializer.data)
