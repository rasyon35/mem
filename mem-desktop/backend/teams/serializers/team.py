from rest_framework import serializers
from teams.models import Team


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['id', 'name', 'description', 'avatar', 'category', 'visibility', 'created_by', 'created_at', 'updated_at', 'settings_json']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class TeamCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['name', 'description', 'avatar', 'category', 'visibility']
