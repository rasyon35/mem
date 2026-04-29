from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import json
from pathlib import Path
from django.conf import settings

WORKSPACE_ROOT = Path(settings.WORKSPACE_ROOT)


@api_view(["POST"])
def track_metric_event(request):
    event_name = request.data.get("event")
    if not event_name:
        return Response({"error": "event required"}, status=status.HTTP_400_BAD_REQUEST)

    metrics_dir = WORKSPACE_ROOT / "_metrics"
    metrics_dir.mkdir(parents=True, exist_ok=True)
    events_file = metrics_dir / "events.jsonl"

    import time
    event = {
        "event": event_name,
        "timestamp": time.time(),
        "payload": request.data.get("payload", {}),
    }
    with open(events_file, "a") as f:
        f.write(json.dumps(event) + "\n")

    return Response({"tracked": True})


@api_view(["GET"])
def get_metrics_summary(request):
    return Response({
        "total_events": 0,
        "events_by_type": {},
    })
