from rest_framework import serializers
from ..models.misc import TeamOnboarding


class TeamOnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamOnboarding
        fields = ("id", "team", "welcome_message", "auto_assign_role", "show_graph_on_join", "require_intro")
