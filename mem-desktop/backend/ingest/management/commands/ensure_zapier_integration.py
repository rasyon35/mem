from django.core.management.base import BaseCommand
from ingest.zapier_installer import ensure_zapier_integration


class Command(BaseCommand):
    help = 'Manually deploy or update the Zapier integration from the repo scaffold.'

    def handle(self, *args, **options):
        ensure_zapier_integration()
        self.stdout.write(self.style.SUCCESS('Zapier integration ensured.'))
