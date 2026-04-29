from rest_framework import serializers
from ..models.misc import TeamBranch


class TeamBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamBranch
        fields = ("id", "team", "name", "description", "status", "creator", "created_at", "updated_at")
