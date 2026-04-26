from dataclasses import dataclass
from typing import Dict, List

from .models import PolicyEvaluation, RemediationTask, Source


@dataclass
class PolicyResult:
    passed: bool
    gate_level: str
    checks: Dict[str, bool]
    risk_score: int
    remediation_ids: List[int]
    missing: List[str]


class IngestPolicyEngine:
    REQUIRED_CHECKS = (
        "index_updated",
        "log_appended",
        "cross_page_updates",
        "contradictions_recorded",
        "provenance_attached",
    )

    def evaluate(self, source: Source, staged_changes: dict, touches_critical: bool) -> PolicyResult:
        checks = self._build_checks(staged_changes)
        missing = [k for k, ok in checks.items() if not ok]
        gate_level = "hard" if touches_critical else "soft"
        passed = not missing if touches_critical else True
        risk_score = min(100, len(missing) * 20 + (30 if touches_critical else 0))

        evaluation = PolicyEvaluation.objects.create(
            source=source,
            passed=passed,
            gate_level=gate_level,
            checks_json=checks,
            risk_score=risk_score,
        )
        remediation_ids = self._create_remediation_tasks(missing, staged_changes, evaluation.id)
        return PolicyResult(
            passed=passed,
            gate_level=gate_level,
            checks=checks,
            risk_score=risk_score,
            remediation_ids=remediation_ids,
            missing=missing,
        )

    def _build_checks(self, staged_changes: dict) -> Dict[str, bool]:
        new_pages = staged_changes.get("new_pages", [])
        updated_pages = staged_changes.get("updated_pages", [])
        contradictions = staged_changes.get("contradictions", [])
        all_pages = new_pages + updated_pages
        return {
            "index_updated": bool(staged_changes.get("index_updated", False)),
            "log_appended": bool(staged_changes.get("log_appended", False)),
            "cross_page_updates": len(updated_pages) > 0 or len(new_pages) > 0,
            "contradictions_recorded": len(contradictions) > 0 or bool(staged_changes.get("contradiction_scan_completed", False)),
            "provenance_attached": any((p.get("source_chunk") or p.get("source_reference")) for p in all_pages),
        }

    def _create_remediation_tasks(self, missing: List[str], staged_changes: dict, evaluation_id: int) -> List[int]:
        ids = []
        for missing_item in missing:
            task = RemediationTask.objects.create(
                task_type=f"policy_{missing_item}",
                target_page=(staged_changes.get("updated_pages") or [{}])[0].get("title", ""),
                reason=f"Missing required ingest obligation: {missing_item}",
                priority=1 if "cross" in missing_item else 2,
                metadata={"evaluation_id": evaluation_id, "source": staged_changes.get("source", "")},
            )
            ids.append(task.id)
        return ids


policy_engine = IngestPolicyEngine()
