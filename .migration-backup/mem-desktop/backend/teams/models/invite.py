from django.db import models
from django.conf import settings
from django.utils import timezone


class TeamInvite(models.Model):
    team = models.ForeignKey("Team", on_delete=models.CASCADE, related_name="invites")
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_invites")
    email = models.EmailField(null=True, blank=True)
    code = models.CharField(max_length=12, unique=True)
    role = models.CharField(max_length=50, default="viewer")
    max_uses = models.IntegerField(default=1)
    uses = models.IntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_valid(self):
        if self.expires_at and self.expires_at < timezone.now():
            return False
        if self.max_uses and self.uses >= self.max_uses:
            return False
        return True

    def __str__(self):
        return f"Invite to {self.team.name} ({self.code})"
