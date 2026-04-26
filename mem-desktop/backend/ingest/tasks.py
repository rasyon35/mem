from datetime import datetime

from celery import shared_task
from django.utils import timezone

from knowledge.models import WorkspacePage
from knowledge.ontology import normalize_entities_for_page

from .models import KnowledgeClaim, LintAction, LintFinding, LintRun, RemediationTask


def _new_run(prefix: str) -> LintRun:
    key = f"{prefix}-{timezone.now().strftime('%Y%m%d%H%M%S')}"
    return LintRun.objects.create(run_key=key, status="running")


@shared_task
def run_wiki_health_pass():
    run = _new_run("wiki-health")
    findings = 0
    pages = WorkspacePage.objects.filter(status="active")
    for page in pages:
        normalize_entities_for_page(page)
        if page.incoming_links.count() == 0 and page.outgoing_links.count() == 0:
            LintFinding.objects.create(
                run=run,
                finding_type="orphan_page",
                target_page=page.title,
                severity="medium",
                auto_fixable=False,
                details={"reason": "page has zero inbound and outbound links"},
            )
            findings += 1
        if not page.blocks.exists():
            LintFinding.objects.create(
                run=run,
                finding_type="empty_page",
                target_page=page.title,
                severity="high",
                auto_fixable=True,
                details={"reason": "page has no content blocks"},
            )
            findings += 1
    run.findings_count = findings
    run.status = "completed"
    run.finished_at = timezone.now()
    run.save(update_fields=["findings_count", "status", "finished_at"])
    return {"run_id": run.id, "findings": findings}


@shared_task
def auto_repair_safe_issues(run_id: int):
    run = LintRun.objects.filter(id=run_id).first()
    if not run:
        return {"error": "run not found"}
    repaired = 0
    for finding in run.findings.filter(auto_fixable=True, resolved=False):
        if finding.finding_type == "empty_page":
            page = WorkspacePage.objects.filter(title=finding.target_page).first()
            if page:
                page.description = page.description or "Auto-filled by lint repair."
                page.save(update_fields=["description", "updated_at"])
                LintAction.objects.create(
                    finding=finding,
                    action_type="autofix_empty_page",
                    payload={"page_id": page.id},
                )
                finding.resolved = True
                finding.save(update_fields=["resolved"])
                repaired += 1
    return {"run_id": run_id, "repaired": repaired}


@shared_task
def emit_research_prompts(run_id: int):
    run = LintRun.objects.filter(id=run_id).first()
    if not run:
        return {"error": "run not found"}
    created = 0
    for finding in run.findings.filter(resolved=False):
        RemediationTask.objects.create(
            task_type="research_prompt",
            target_page=finding.target_page,
            reason=f"Investigate finding: {finding.finding_type}",
            priority=2,
            metadata={"run_id": run_id, "finding_id": finding.id},
        )
        created += 1
    return {"run_id": run_id, "tasks_created": created}


@shared_task
def scan_stale_claims():
    run = _new_run("stale-claims")
    findings = 0
    for claim in KnowledgeClaim.objects.filter(status="active"):
        newer = (
            KnowledgeClaim.objects.filter(page_title=claim.page_title, created_at__gt=claim.created_at)
            .exclude(id=claim.id)
            .order_by("-created_at")
            .first()
        )
        if newer:
            claim.status = "superseded"
            claim.superseded_by = newer
            claim.save(update_fields=["status", "superseded_by", "updated_at"])
            LintFinding.objects.create(
                run=run,
                finding_type="stale_claim",
                target_page=claim.page_title,
                severity="medium",
                auto_fixable=True,
                details={"claim_id": claim.id, "superseded_by": newer.id},
            )
            findings += 1
    run.findings_count = findings
    run.status = "completed"
    run.finished_at = timezone.now()
    run.save(update_fields=["findings_count", "status", "finished_at"])
    return {"run_id": run.id, "findings": findings}


@shared_task
def scan_orphan_pages():
    run = _new_run("orphan-pages")
    findings = 0
    for page in WorkspacePage.objects.filter(status="active"):
        if page.incoming_links.count() == 0 and page.outgoing_links.count() == 0:
            LintFinding.objects.create(
                run=run,
                finding_type="orphan_page",
                target_page=page.title,
                severity="low",
                auto_fixable=False,
                details={},
            )
            findings += 1
    run.findings_count = findings
    run.status = "completed"
    run.finished_at = timezone.now()
    run.save(update_fields=["findings_count", "status", "finished_at"])
    return {"run_id": run.id, "findings": findings}
