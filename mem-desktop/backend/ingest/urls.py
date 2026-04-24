from django.urls import path, re_path
from . import views
from . import git_server
from . import export_views

urlpatterns = [
    path("ingest", views.ingest_file, name="ingest"),
    path("approve", views.approve_changes, name="approve"),
    path("chat", views.chat_query, name="chat"),
    path("wiki", views.list_wiki_pages, name="wiki-list"),
    path("wiki/<str:title>", views.get_wiki_page, name="wiki-page"),
    path("history", views.get_git_history, name="history"),
    path("pull_requests", views.list_pull_requests, name="pull-requests"),
    path("pull_requests/diff", views.get_pull_request_diff, name="pull-request-diff"),
    path("revert", views.revert_version, name="revert"),
    path("critical", views.manage_critical_pages, name="critical"),
    path("contradictions", views.list_contradictions, name="contradictions"),
    path("graph", views.get_graph_data, name="graph-data"),
    
    # --- Phase 4: Team Collaboration ---
    path("team", views.manage_team, name="team"),
    path("locks", views.manage_locks, name="locks"),
    path("sync_status", views.sync_status, name="sync_status"),
    path("conflicts", views.get_git_conflicts, name="conflicts"),
    path("resolve_conflict", views.resolve_conflict, name="resolve_conflict"),
    path("track_activity", views.track_activity, name="track_activity"),
    path("presence", views.get_presence, name="presence"),
    
    # The Git Hub (Built-in Git Server)
    re_path(r"^git/(?P<repo_name>[^/]+)/", git_server.git_hub_view, name="git-hub"),
    
    # --- Phase 5: Automated Synthesis & OpenClaw ---
    path("suggestions", views.get_suggestions, name="suggestions"),
    path("synthesize_hub", views.synthesize_hub, name="synthesize-hub"),
    path("reorganize_categories", views.reorganize_categories, name="reorganize-categories"),
    path("apply_categories", views.apply_categories, name="apply-categories"),
    
    # OpenClaw (The Intelligence Brain)
    path("openclaw/proposals", views.list_openclaw_proposals, name="openclaw-proposals"),
    path("openclaw/handle", views.handle_openclaw_proposal, name="openclaw-handle"),
    path("openclaw/evolve", views.trigger_evolution, name="openclaw-evolve"),

    # --- Phase 7: Archival & Export ---
    path("export_page", export_views.export_page, name="export_page"),
    path("export_all", export_views.export_all, name="export_all"),
    path("create_snapshot", views.create_snapshot, name="create_snapshot"),
    path("list_snapshots", views.list_snapshots, name="list_snapshots"),
]