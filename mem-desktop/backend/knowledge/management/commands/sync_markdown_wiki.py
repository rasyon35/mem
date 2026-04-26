from django.core.management.base import BaseCommand

from knowledge.wiki_projection import sync_wiki_to_db


class Command(BaseCommand):
    help = "Explicitly sync markdown wiki files into knowledge DB projection."

    def handle(self, *args, **options):
        sync_wiki_to_db()
        self.stdout.write(self.style.SUCCESS("Wiki projection sync completed."))
