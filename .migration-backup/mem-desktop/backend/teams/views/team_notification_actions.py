from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import TeamNotification


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    try:
        notif = TeamNotification.objects.get(id=notification_id, user=request.user)
        notif.read = True
        notif.save()
        return Response({"success": True})
    except TeamNotification.DoesNotExist:
        return Response({"error": "Notification not found"}, status=status.HTTP_404_NOT_FOUND)
