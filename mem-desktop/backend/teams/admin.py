from django.contrib import admin
from .models import (
    Team,
    TeamMembership,
    TeamInvite,
    TeamPage,
    TeamPageRevision,
    TeamGraphNode,
    TeamGraphLink,
    TeamBranch,
    TeamChatMessage,
    TeamOnboarding,
    TeamActivity,
    TeamKnowledgeConflict,
    TeamNotification,
    TeamAuditLog,
)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "visibility", "created_by", "created_at"]
    list_filter = ["category", "visibility"]
    search_fields = ["name", "description"]


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ["team", "user", "role", "is_active", "joined_at"]
    list_filter = ["role", "is_active"]
    search_fields = ["team__name", "user__username"]


@admin.register(TeamInvite)
class TeamInviteAdmin(admin.ModelAdmin):
    list_display = ["team", "email", "code", "role", "uses", "max_uses", "expires_at"]
    list_filter = ["role"]
    search_fields = ["team__name", "email"]


@admin.register(TeamPage)
class TeamPageAdmin(admin.ModelAdmin):
    list_display = ["team", "title", "page_type", "publish_state", "created_by"]
    list_filter = ["page_type", "publish_state"]
    search_fields = ["title"]


@admin.register(TeamPageRevision)
class TeamPageRevisionAdmin(admin.ModelAdmin):
    list_display = ["page", "editor", "note", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["page__title"]


@admin.register(TeamGraphNode)
class TeamGraphNodeAdmin(admin.ModelAdmin):
    list_display = ["team", "node_type", "created_by", "created_at"]
    list_filter = ["node_type"]
    search_fields = ["node_type"]


@admin.register(TeamGraphLink)
class TeamGraphLinkAdmin(admin.ModelAdmin):
    list_display = ["team", "source_node", "target_node", "link_type"]
    list_filter = ["link_type"]
    search_fields = ["team__name"]


@admin.register(TeamBranch)
class TeamBranchAdmin(admin.ModelAdmin):
    list_display = ["team", "name", "status", "creator", "created_at"]
    list_filter = ["status"]
    search_fields = ["name"]


@admin.register(TeamChatMessage)
class TeamChatMessageAdmin(admin.ModelAdmin):
    list_display = ["team", "user", "message", "created_at"]
    list_filter = ["team"]
    search_fields = ["message"]


@admin.register(TeamOnboarding)
class TeamOnboardingAdmin(admin.ModelAdmin):
    list_display = ["team", "auto_assign_role", "show_graph_on_join"]


@admin.register(TeamActivity)
class TeamActivityAdmin(admin.ModelAdmin):
    list_display = ["team", "user", "action", "target_type", "created_at"]
    list_filter = ["action"]
    search_fields = ["team__name"]


@admin.register(TeamKnowledgeConflict)
class TeamKnowledgeConflictAdmin(admin.ModelAdmin):
    list_display = ["team", "node_a", "node_b", "status", "created_at"]
    list_filter = ["status"]


@admin.register(TeamNotification)
class TeamNotificationAdmin(admin.ModelAdmin):
    list_display = ["team", "user", "notification_type", "read", "created_at"]
    list_filter = ["notification_type", "read"]
    search_fields = ["team__name", "user__username"]


@admin.register(TeamAuditLog)
class TeamAuditLogAdmin(admin.ModelAdmin):
    list_display = ["team", "actor", "action", "created_at"]
    list_filter = ["action"]
    search_fields = ["team__name"]