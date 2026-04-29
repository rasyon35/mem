from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import Team, TeamMembership, TeamNotification
from ..serializers import TeamNotificationSerializer
from .team_core import get_team_membership


@api_view(["GET", "PUT", "POST"])
@permission_classes([IsAuthenticated])
def team_notifications(request, team_id):
    try:
        team = Team.objects.get(id=team_id)
        membership = get_team_membership(request, team)
        if not membership:
            return Response({"error": "Not a member"}, status=status.HTTP_403_FORBIDDEN)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        notifications = request.user.team_notifications.filter(
            team=team
        ).order_by("-created_at")[:50]
        return Response(TeamNotificationSerializer(notifications, many=True).data)

    elif request.method == "PUT":
        notification_ids = request.data.get("notification_ids", [])
        request.user.team_notifications.filter(
            team=team, id__in=notification_ids
        ).update(read=True)
        return Response({"updated": True})

    elif request.method == "POST":
        if membership.role not in ["owner", "editor"]:
            return Response({"error": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
        user_id = request.data.get("user_id")
        message = request.data.get("message")
        if not user_id or not message:
            return Response({"error": "user_id and message required"}, status=status.HTTP_400_BAD_REQUEST)
        from ..models import TeamNotification
        notification = TeamNotification.objects.create(
            team=team,
            user_id=user_id,
            message=message,
            notification_type=request.data.get("type", "info"),
        )
        return Response(TeamNotificationSerializer(notification).data, status=status.HTTP_201_CREATED)
