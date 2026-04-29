from django.db import models
from django.conf import settings
from django.utils import timezone


class TeamCategory(models.TextChoices):
    STARTUP = "startup", "Startup"
    RESEARCH = "research", "Research"
    STUDY_GROUP = "study_group", "Study Group"
    FAMILY = "family", "Family"
    OPERATIONS = "operations", "Operations"
    CUSTOM = "custom", "Custom"


class TeamVisibility(models.TextChoices):
    PRIVATE = "private", "Private Invite Only"
    LINK = "link", "Link Access"
    DISCOVERABLE = "discoverable", "Discoverable"


class TeamRole(models.TextChoices):
    OWNER = "owner", "Owner"
    EDITOR = "editor", "Editor"
    VIEWER = "viewer", "Viewer"


class TeamPageType(models.TextChoices):
    STANDARD = "standard", "Standard Page"
    SHARED_SOP = "shared_sop", "Shared SOP"
    DECISION = "decision", "Decision Page"
    KNOWLEDGE_NODE = "knowledge_node", "Knowledge Node"
    MEETING_SYNTHESIS = "meeting_synthesis", "Meeting Synthesis"


class PublishState(models.TextChoices):
    DRAFT = "draft", "Draft"
    TEAM_SHARED = "team_shared", "Team Shared"
    CANONICAL = "canonical", "Canonical Team Page"
