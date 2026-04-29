from rest_framework import serializers
from ..models.misc import TeamKnowledgeConflict


class TeamKnowledgeConflictSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamKnowledgeConflict
        fields = ("id", "team", "node_a", "node_b", "status", "resolution", "resolved_by", "created_at")
