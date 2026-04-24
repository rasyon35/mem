import time
from django.core.management.base import BaseCommand
from ingest.openclaw import open_claw

class Command(BaseCommand):
    help = "Runs the OpenClaw analysis loop to evolve the knowledge base"

    def add_arguments(self, parser):
        parser.add_argument(
            "--continuous",
            action="store_true",
            help="Run in a continuous loop",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=60,
            help="Interval in seconds between analysis cycles (default: 60)",
        )

    def handle(self, *args, **options):
        continuous = options["continuous"]
        interval = options["interval"]

        self.stdout.write(self.style.SUCCESS("Starting OpenClaw Evolution Engine..."))

        try:
            while True:
                self.stdout.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting analysis cycle...")
                results = open_claw.run_analysis_cycle()
                for res in results:
                    self.stdout.write(f"  - {res}")
                
                if not continuous:
                    break
                
                self.stdout.write(f"Cycle complete. Waiting {interval}s...")
                time.sleep(interval)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Evolution engine stopped."))
