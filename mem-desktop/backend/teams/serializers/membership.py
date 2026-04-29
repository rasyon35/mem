from rest_framework import serializers
from teams.models import TeamMembership
from .user import UserSerializer


class TeamMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TeamMembership
        fields = ['id', 'team', 'user', 'role', 'joined_at', 'is_active']
        read_only_fields = ['id', 'joined_at']
