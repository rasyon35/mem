from django.db import models
from django.conf import settings


class TeamBranch(models.Model):
    team = models.ForeignKey("Team", on_delete=models.CASCADE, related_name="branches")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=50, default="draft")
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_branches")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.status})"


class TeamChatMessage(models.Model):
    team = models.ForeignKey("Team", on_delete=models.CASCADE, related_name="chat_messages")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_chat_messages")
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user}: {self.message[:50]}"


class TeamOnboarding(models.Model):
    team = models.OneToOneField("Team", on_delete=models.CASCADE, related_name="onboarding")
    welcome_message = models.TextField(blank=True)
    auto_assign_role = models.CharField(max_length=50, default="viewer")
    show_graph_on_join = models.BooleanField(default=True)
    require_intro = models.BooleanField(default=False)

    def __str__(self):
        return f"Onboarding for {self.team.name}"


class TeamActivity(models.Model):
    team = models.ForeignKey("Team", on_delete=models.CASCADE, related_name="activities")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_activities")
    action = models.CharField(max_length=255)
    target_type = models.CharField(max_length=50)
    target_id = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} {self.action}"


class TeamKnowledgeConflict(models.Model):
    team = models.ForeignKey("Team", on_delete=models.CASCADE, related_name="conflicts")
    node_a = models.UUIDField()
    node_b = models.UUIDField()
    status = models.CharField(max_length=50, default="detected")
    resolution = models.TextField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Conflict in {self.team.name}"


class TeamNotification(models.Model):
    team = models.ForeignKey("Team", on_delete=models.CASCADE, related_name="notifications")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_notifications")
    message = models.TextField()
    notification_type = models.CharField(max_length=50, default="info")
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.user}"


class TeamAuditLog(models.Model):
    team = models.ForeignKey("Team", on_delete=models.CASCADE, related_name="audit_logs")
    action = models.CharField(max_length=255)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="audit_actions")
    target_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_targets")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.actor} {self.action}"
