from rest_framework import serializers
from ..models.misc import TeamChatMessage


class TeamChatMessageSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = TeamChatMessage
        fields = ("id", "team", "user", "user_name", "message", "created_at")
