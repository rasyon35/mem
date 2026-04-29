from django.db import models
from django.conf import settings
from .choices import TeamPageType, PublishState


class TeamPage(models.Model):
    team = models.ForeignKey("Team", on_delete=models.CASCADE, related_name="pages")
    title = models.CharField(max_length=255)
    content_json = models.JSONField(default=dict, blank=True)
    page_type = models.CharField(max_length=50, choices=TeamPageType.choices, default=TeamPageType.STANDARD)
    status = models.CharField(max_length=50, default="active")
    publish_state = models.CharField(max_length=50, choices=PublishState.choices, default=PublishState.DRAFT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_team_pages")
    locked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="locked_team_pages")
    source_page_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class TeamPageRevision(models.Model):
    page = models.ForeignKey(TeamPage, on_delete=models.CASCADE, related_name="revisions")
    editor = models.CharField(max_length=255)
    content_snapshot = models.JSONField()
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Revision for {self.page.title}"
