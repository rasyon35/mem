from django.apps import AppConfig


class IngestConfig(AppConfig):
    name = 'ingest'

    def ready(self):
        try:
            from .openclaw_installer import ensure_openclaw_background
            ensure_openclaw_background()
        except Exception as e:
            print(f'OpenClaw startup integration failed: {e}')
