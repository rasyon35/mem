from rest_framework import serializers
from ..models.graph import TeamGraphNode, TeamGraphLink


class TeamGraphNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamGraphNode
        fields = ("id", "team", "node_type", "content", "created_by", "created_at", "updated_at")


class TeamGraphLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamGraphLink
        fields = ("id", "team", "source_node", "target_node", "link_type", "created_at")
