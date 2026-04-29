from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import json

from ..models import Team, TeamMembership
from .team_core import get_team_membership

from ..ai_integration import team_chat_processor
from ingest.ai_client import memos_ai


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def team_ai_chat(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    query = request.data.get("query") or request.data.get("question")
    if not query:
        return Response({"error": "Query required"}, status=status.HTTP_400_BAD_REQUEST)

    context = request.data.get("context", {})

    try:
        result = team_chat_processor(
            team=team,
            user=request.user,
            question=query,
            ai_client=memos_ai,
        )
        ai_resp = result.get("ai_response", {})
        return Response({
            "response": ai_resp.get("content", ""),
            "citations": [],
            "confidence": "medium",
        })
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
