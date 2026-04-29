from rest_framework import serializers
from ..models.misc import TeamActivity


class TeamActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = TeamActivity
        fields = ("id", "team", "user", "user_name", "action", "target_type", "target_id", "created_at")
