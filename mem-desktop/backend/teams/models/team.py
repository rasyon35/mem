from django.db import models
from django.conf import settings
from django.utils import timezone
from .choices import TeamCategory, TeamVisibility


class Team(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    avatar = models.URLField(blank=True)
    category = models.CharField(max_length=50, choices=TeamCategory.choices, default=TeamCategory.CUSTOM)
    visibility = models.CharField(max_length=50, choices=TeamVisibility.choices, default=TeamVisibility.PRIVATE)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_teams")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    settings_json = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.name
