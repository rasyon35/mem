from rest_framework import serializers
from ..models.misc import TeamAuditLog


class TeamAuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = TeamAuditLog
        fields = ("id", "team", "action", "actor", "actor_name", "target_user", "created_at")
