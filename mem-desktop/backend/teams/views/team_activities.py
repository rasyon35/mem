from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Team, TeamMembership, TeamActivity
from ..serializers import TeamActivitySerializer
from .team_core import get_team_membership


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def team_activities(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    activities = team.activities.all().order_by("-created_at")[:50]
    return Response(TeamActivitySerializer(activities, many=True).data)
