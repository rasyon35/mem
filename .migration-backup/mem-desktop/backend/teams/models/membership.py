from django.db import models
from django.conf import settings
from django.utils import timezone
from .choices import TeamRole


class TeamMembership(models.Model):
    team = models.ForeignKey("Team", on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_memberships")
    role = models.CharField(max_length=50, choices=TeamRole.choices, default=TeamRole.VIEWER)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("team", "user")

    def __str__(self):
        return f"{self.user} - {self.team} ({self.role})"
