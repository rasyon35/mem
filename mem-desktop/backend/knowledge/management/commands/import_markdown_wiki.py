from django.core.management.base import BaseCommand
from django.conf import settings
from pathlib import Path
import os

class Command(BaseCommand):
    help = 'Import markdown files from wiki directory into database'

    def handle(self, *args, **options):
        wiki_dir = Path(settings.WORKSPACE_WIKI_DIR)
        if not wiki_dir.exists():
            self.stdout.write(self.style.WARNING(f"Wiki directory not found: {wiki_dir}"))
            return
        
        from knowledge.models import WorkspacePage, PageBlock
        from knowledge.wiki_projection import sync_wiki_to_db
        
        # Sync wiki directory to database
        sync_wiki_to_db()
        
        count = WorkspacePage.objects.count()
        self.stdout.write(self.style.SUCCESS(f"Successfully synced {count} pages from wiki"))
