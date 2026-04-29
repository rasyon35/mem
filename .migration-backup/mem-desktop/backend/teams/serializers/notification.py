from rest_framework import serializers
from ..models.misc import TeamNotification


class TeamNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamNotification
        fields = ("id", "team", "user", "message", "notification_type", "read", "created_at")
