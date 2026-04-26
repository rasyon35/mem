from django.db import models

class Source(models.Model):
    name = models.CharField(max_length=255)
    source_type = models.CharField(max_length=50) # 'file' or 'url'
    path_or_url = models.TextField()
    summary = models.TextField(blank=True)
    reliability_score = models.IntegerField(default=3) # 1-5 scale
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.source_type})"

class Contradiction(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("dismissed", "Dismissed"),
    ]
    source = models.ForeignKey(Source, on_delete=models.CASCADE, related_name="contradictions")
    existing_page = models.CharField(max_length=255)
    existing_claim = models.TextField()
    new_claim = models.TextField()
    confidence = models.CharField(max_length=20)  # high, medium, low
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Conflict in {self.existing_page} from {self.source.name}"

class CriticalPage(models.Model):
    title = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class PageSource(models.Model):
    page_title = models.CharField(max_length=255)
    source = models.ForeignKey(Source, on_delete=models.CASCADE, related_name="page_sources")
    page_reference = models.CharField(max_length=255, blank=True)
    chunk_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.page_title} -> {self.source.name}"


class RawArtifactLedger(models.Model):
    source = models.ForeignKey(Source, on_delete=models.CASCADE, related_name="raw_artifacts")
    sha256 = models.CharField(max_length=64)
    mime_type = models.CharField(max_length=120, blank=True, default="")
    canonical_path = models.TextField()
    size_bytes = models.BigIntegerField(default=0)
    ingested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-ingested_at"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("RawArtifactLedger entries are immutable once created.")
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.sha256[:12]}… @ {self.canonical_path}"


class PolicyEvaluation(models.Model):
    GATE_CHOICES = [
        ("hard", "Hard"),
        ("soft", "Soft"),
    ]
    source = models.ForeignKey(Source, on_delete=models.CASCADE, related_name="policy_evaluations")
    passed = models.BooleanField(default=False)
    gate_level = models.CharField(max_length=16, choices=GATE_CHOICES, default="soft")
    checks_json = models.JSONField(default=dict)
    risk_score = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class RemediationTask(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("done", "Done"),
        ("dismissed", "Dismissed"),
    ]
    task_type = models.CharField(max_length=80)
    target_page = models.CharField(max_length=255, blank=True)
    reason = models.TextField()
    priority = models.PositiveIntegerField(default=3)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    due_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class KnowledgeClaim(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("superseded", "Superseded"),
        ("contested", "Contested"),
    ]
    page_title = models.CharField(max_length=255)
    claim_text = models.TextField()
    source = models.ForeignKey(Source, on_delete=models.SET_NULL, null=True, blank=True, related_name="claims")
    confidence = models.CharField(max_length=20, default="medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    superseded_by = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="supersedes"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ClaimRevision(models.Model):
    claim = models.ForeignKey(KnowledgeClaim, on_delete=models.CASCADE, related_name="revisions")
    revision_text = models.TextField()
    note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)


class LintRun(models.Model):
    STATUS_CHOICES = [
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]
    run_key = models.CharField(max_length=80, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="running")
    findings_count = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)


class LintFinding(models.Model):
    SEVERITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]
    run = models.ForeignKey(LintRun, on_delete=models.CASCADE, related_name="findings")
    finding_type = models.CharField(max_length=80)
    target_page = models.CharField(max_length=255, blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="low")
    details = models.JSONField(default=dict, blank=True)
    auto_fixable = models.BooleanField(default=False)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class LintAction(models.Model):
    finding = models.ForeignKey(LintFinding, on_delete=models.CASCADE, related_name="actions")
    action_type = models.CharField(max_length=80)
    status = models.CharField(max_length=20, default="done")
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class QueryArtifact(models.Model):
    query_text = models.TextField()
    page_context = models.CharField(max_length=255, blank=True)
    artifact_slug = models.SlugField(max_length=220)
    artifact_title = models.CharField(max_length=220)
    confidence = models.CharField(max_length=20, default="medium")
    citations_json = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)


class ArtifactRevision(models.Model):
    artifact = models.ForeignKey(QueryArtifact, on_delete=models.CASCADE, related_name="revisions")
    content = models.TextField()
    note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
