import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

app = Celery("backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "wiki-health-pass": {
        "task": "ingest.tasks.run_wiki_health_pass",
        "schedule": 60.0 * 30,
    },
    "stale-claim-scan": {
        "task": "ingest.tasks.scan_stale_claims",
        "schedule": 60.0 * 45,
    },
    "orphan-link-scan": {
        "task": "ingest.tasks.scan_orphan_pages",
        "schedule": 60.0 * 60,
    },
}
