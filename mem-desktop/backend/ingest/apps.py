from django.apps import AppConfig


class IngestConfig(AppConfig):
    name = 'ingest'

    def ready(self):
        # Ingest app stays focused on ingestion/chat/semantic processing only.
        return
