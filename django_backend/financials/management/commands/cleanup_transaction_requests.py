from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from financials.models import TransactionRequest


class Command(BaseCommand):
    help = "Delete approved/rejected transaction requests older than X days"

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Delete requests older than this many days (default: 7)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        cutoff_date = timezone.now() - timedelta(days=days)

        queryset = TransactionRequest.objects.filter(
            status__in=[
                TransactionRequest.Status.APPROVED,
                TransactionRequest.Status.REJECTED
            ],
            updated_at__lt=cutoff_date
        )

        count = queryset.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'[DRY RUN] Would delete {count} transaction requests '
                    f'older than {days} days'
                )
            )
        else:
            deleted_count, _ = queryset.delete()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Deleted {deleted_count} old transaction requests'
                )
            )
