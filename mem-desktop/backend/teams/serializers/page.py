from rest_framework import serializers
from teams.models import TeamPage, TeamPageRevision
from .user import UserSerializer


class TeamPageSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = TeamPage
        fields = ['id', 'team', 'title', 'content_json', 'page_type', 'status', 'publish_state', 'created_by', 'locked_by', 'source_page_id', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class TeamPageRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamPageRevision
        fields = ['id', 'page', 'editor', 'content_snapshot', 'note', 'created_at']
        read_only_fields = ['id', 'created_at']
