from rest_framework import serializers
from teams.models import TeamInvite


class TeamInviteSerializer(serializers.ModelSerializer):
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = TeamInvite
        fields = ['id', 'team', 'invited_by', 'email', 'code', 'role', 'max_uses', 'uses', 'expires_at', 'created_at', 'is_valid']
        read_only_fields = ['id', 'code', 'uses', 'created_at', 'is_valid']
