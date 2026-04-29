from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Team, TeamMembership, TeamChatMessage
from ..serializers import TeamChatMessageSerializer
from .team_core import get_team_membership


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def team_chat(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        messages = team.chat_messages.all().order_by("-created_at")[:50]
        return Response(TeamChatMessageSerializer(messages, many=True).data)

    elif request.method == "POST":
        serializer = TeamChatMessageSerializer(
            data=request.data, context={"request": request, "team": team}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
