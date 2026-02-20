from django.core.management.base import BaseCommand
from financials.models import DebtRequest


class Command(BaseCommand):
    help = 'Delete all approved and rejected debt requests from the database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show how many records would be deleted without actually deleting them.',
        )

    def handle(self, *args, **options):
        qs = DebtRequest.objects.filter(status__in=['Approved', 'Rejected'])
        count = qs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No approved/rejected debt requests found.'))
            return

        if options['dry_run']:
            self.stdout.write(self.style.WARNING(f'[DRY RUN] Would delete {count} debt request(s).'))
            return

        qs.delete()
        self.stdout.write(self.style.SUCCESS(f'Successfully deleted {count} debt request(s).'))
