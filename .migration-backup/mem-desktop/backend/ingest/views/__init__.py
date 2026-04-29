from .ingest_core import (
    _artifact_slug,
    _persist_query_artifact,
    _append_metric_event,
    ingest_file,
    ingest_text,
    approve_changes,
)

from .chat import (
    chat_query,
    chat_with_context,
)

from .snapshots import (
    create_snapshot,
    list_snapshots,
    get_git_history,
    list_pull_requests,
    get_pull_request_diff,
    revert_version,
)

from .sources import (
    manage_sources,
    get_setup_status,
    setup_activate,
)

from .contradictions import list_contradictions

from .suggestions import (
    get_suggestions,
    synthesize_hub,
)

from .categories import (
    reorganize_categories,
    apply_categories,
)

from .files import (
    open_source_file,
    publish_wiki,
)

from .voice import voice_capture

from .metrics import (
    track_metric_event,
    get_metrics_summary,
)

from .graph import (
    node_context,
    related_nodes,
    path_between,
)

from .critical_pages import manage_critical_pages

from ..views_lint import (
    run_lint,
    lint_status,
    lint_findings,
    lint_autofix,
    lint_research_prompts,
    remediation_tasks,
    remediation_update,
    query_artifacts,
    undo_query_artifact,
)

from ..views_collab import (
    manage_team,
    manage_locks,
    sync_status,
    get_git_conflicts,
    resolve_conflict,
    track_activity,
    get_presence,
)

# Expose at views level for backward compatibility and test patching
from ..ai_client import memos_ai as ai_client
from ..processor import ingest_processor
