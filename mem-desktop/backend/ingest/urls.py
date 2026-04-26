from django.urls import path, re_path
from . import views
from . import git_server
from . import export_views

urlpatterns = [
    path("ingest", views.ingest_file, name="ingest"),
    path("ingest/text", views.ingest_text, name="ingest-text"),
    path("approve", views.approve_changes, name="approve"),
    path("chat", views.chat_query, name="chat"),
    path("history", views.get_git_history, name="history"),
    path("pull_requests", views.list_pull_requests, name="pull-requests"),
    path("pull_requests/diff", views.get_pull_request_diff, name="pull-request-diff"),
    path("revert", views.revert_version, name="revert"),
    path("critical", views.manage_critical_pages, name="critical"),
    path("contradictions", views.list_contradictions, name="contradictions"),
    
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
    
    # --- Phase 5: Automated Synthesis ---
    path("suggestions", views.get_suggestions, name="suggestions"),
    path("synthesize_hub", views.synthesize_hub, name="synthesize-hub"),
    path("reorganize_categories", views.reorganize_categories, name="reorganize-categories"),
    path("apply_categories", views.apply_categories, name="apply-categories"),
    
    # --- Phase 7: Archival & Export ---
    path("export_page", export_views.export_page, name="export_page"),
    path("export_all", export_views.export_all, name="export_all"),
    path("create_snapshot", views.create_snapshot, name="create_snapshot"),
    path("open_source", views.open_source_file, name="open-source"),
    path("voice_capture", views.voice_capture, name="voice-capture"),
    path("publish", views.publish_wiki, name="publish"),
    path("sources", views.manage_sources, name="sources"),
    path("list_snapshots", views.list_snapshots, name="list_snapshots"),
    
    # Onboarding & Setup
    path("setup/status", views.get_setup_status, name="setup-status"),
    path("setup/activate", views.setup_activate, name="setup-activate"),
    path("metrics/event", views.track_metric_event, name="metrics-event"),
    path("metrics/summary", views.get_metrics_summary, name="metrics-summary"),
    path("lint/run", views.run_lint, name="lint-run"),
    path("lint/status", views.lint_status, name="lint-status"),
    path("lint/findings", views.lint_findings, name="lint-findings"),
    path("lint/autofix", views.lint_autofix, name="lint-autofix"),
    path("lint/research_prompts", views.lint_research_prompts, name="lint-research-prompts"),
    path("remediation/tasks", views.remediation_tasks, name="remediation-tasks"),
    path("remediation/update", views.remediation_update, name="remediation-update"),
    path("query_artifacts", views.query_artifacts, name="query-artifacts"),
    path("query_artifacts/undo", views.undo_query_artifact, name="query-artifacts-undo"),
]