from rest_framework.decorators import api_view
from rest_framework.response import Response

from knowledge.models import PageBlock, WorkspacePage
from knowledge.wiki_projection import write_page_to_file

from .models import ArtifactRevision, LintFinding, LintRun, QueryArtifact, RemediationTask
from .tasks import auto_repair_safe_issues, emit_research_prompts, run_wiki_health_pass


@api_view(["POST"])
def run_lint(request):
    async_run = str(request.data.get("async", "true")).lower() == "true"
    if async_run:
        task = run_wiki_health_pass.delay()
        return Response({"status": "queued", "task_id": task.id}, status=202)
    result = run_wiki_health_pass()
    return Response(result, status=200)


@api_view(["GET"])
def lint_status(request):
    runs = LintRun.objects.order_by("-started_at")[:20]
    return Response(
        {
            "runs": [
                {
                    "id": run.id,
                    "run_key": run.run_key,
                    "status": run.status,
                    "findings_count": run.findings_count,
                    "started_at": run.started_at.isoformat(),
                    "finished_at": run.finished_at.isoformat() if run.finished_at else None,
                }
                for run in runs
            ]
        }
    )


@api_view(["GET"])
def lint_findings(request):
    run_id = request.query_params.get("run_id")
    findings = LintFinding.objects.all().order_by("-created_at")
    if run_id:
        findings = findings.filter(run_id=run_id)
    return Response(
        {
            "findings": [
                {
                    "id": f.id,
                    "run_id": f.run_id,
                    "type": f.finding_type,
                    "target_page": f.target_page,
                    "severity": f.severity,
                    "auto_fixable": f.auto_fixable,
                    "resolved": f.resolved,
                    "details": f.details,
                    "created_at": f.created_at.isoformat(),
                }
                for f in findings[:200]
            ]
        }
    )


@api_view(["POST"])
def lint_autofix(request):
    run_id = request.data.get("run_id")
    if not run_id:
        return Response({"error": "run_id is required"}, status=400)
    result = auto_repair_safe_issues.delay(run_id)
    return Response({"status": "queued", "task_id": result.id}, status=202)


@api_view(["POST"])
def lint_research_prompts(request):
    run_id = request.data.get("run_id")
    if not run_id:
        return Response({"error": "run_id is required"}, status=400)
    result = emit_research_prompts.delay(run_id)
    return Response({"status": "queued", "task_id": result.id}, status=202)


@api_view(["GET"])
def remediation_tasks(request):
    tasks = RemediationTask.objects.order_by("status", "-created_at")[:200]
    return Response(
        {
            "tasks": [
                {
                    "id": t.id,
                    "task_type": t.task_type,
                    "target_page": t.target_page,
                    "reason": t.reason,
                    "priority": t.priority,
                    "status": t.status,
                    "metadata": t.metadata,
                    "created_at": t.created_at.isoformat(),
                }
                for t in tasks
            ]
        }
    )


@api_view(["PATCH"])
def remediation_update(request):
    task_id = request.data.get("id")
    status_value = request.data.get("status")
    if not task_id or not status_value:
        return Response({"error": "id and status are required"}, status=400)
    task = RemediationTask.objects.filter(id=task_id).first()
    if not task:
        return Response({"error": "task not found"}, status=404)
    task.status = status_value
    task.save(update_fields=["status"])
    return Response({"status": "updated"})


@api_view(["GET"])
def query_artifacts(request):
    items = QueryArtifact.objects.order_by("-created_at")[:100]
    return Response(
        {
            "artifacts": [
                {
                    "id": a.id,
                    "slug": a.artifact_slug,
                    "title": a.artifact_title,
                    "confidence": a.confidence,
                    "page_context": a.page_context,
                    "is_active": a.is_active,
                    "created_at": a.created_at.isoformat(),
                }
                for a in items
            ]
        }
    )


@api_view(["POST"])
def undo_query_artifact(request):
    artifact_id = request.data.get("artifact_id")
    artifact = QueryArtifact.objects.filter(id=artifact_id).first()
    if not artifact:
        return Response({"error": "artifact not found"}, status=404)
    latest = artifact.revisions.order_by("-created_at").first()
    if not latest:
        artifact.is_active = False
        artifact.save(update_fields=["is_active"])
        return Response({"status": "deactivated"})
    page = WorkspacePage.objects.filter(slug=artifact.artifact_slug).first()
    if page:
        page.blocks.all().delete()
        PageBlock.objects.create(
            page=page,
            block_type="paragraph",
            content_json={"text": "Artifact reverted by user."},
            order_index=0,
        )
        write_page_to_file(page)
    artifact.is_active = False
    artifact.save(update_fields=["is_active"])
    ArtifactRevision.objects.create(
        artifact=artifact,
        content="Artifact reverted by user.",
        note="manual undo",
    )
    return Response({"status": "reverted", "artifact_id": artifact.id})
