from django.urls import path, re_path
from . import views
from . import git_server

urlpatterns = [
    path("ingest", views.ingest_file, name="ingest"),
    path("approve", views.approve_changes, name="approve"),
    path("chat", views.chat_query, name="chat"),
    path("wiki", views.list_wiki_pages, name="wiki-list"),
    path("wiki/<str:title>", views.get_wiki_page, name="wiki-page"),
    path("history", views.get_git_history, name="history"),
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
    
    # --- Bulk Categorization ---
    path("reorganize_categories", views.reorganize_categories, name="reorganize-categories"),
    path("apply_categories", views.apply_categories, name="apply-categories"),
]