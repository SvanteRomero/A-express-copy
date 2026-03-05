from datetime import datetime

from django.core.management.base import BaseCommand
from django.db.models import Sum, Value, CharField
from django.db.models.functions import Coalesce
from django.utils import timezone

from financials.models import Payment


class Command(BaseCommand):
    help = (
        'Get the opening balance for any day within the payment history. '
        'The opening balance is the net sum of all payments before the given date.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Target date in YYYY-MM-DD format. Defaults to today.',
        )
        parser.add_argument(
            '--breakdown',
            action='store_true',
            help='Show a breakdown of the opening balance by payment method.',
        )

    def handle(self, *args, **options):
        # Resolve target date
        date_str = options.get('date')
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                self.stderr.write(
                    self.style.ERROR('Invalid date format. Use YYYY-MM-DD.')
                )
                return
        else:
            target_date = timezone.localdate()

        # Query all payments before the target date
        payments_before = Payment.objects.filter(date__lt=target_date)
        total = payments_before.aggregate(
            total=Coalesce(Sum('amount'), 0)
        )['total']

        self.stdout.write(
            self.style.SUCCESS(
                f'Opening balance for {target_date}: {total:,.2f}'
            )
        )

        # Optional breakdown by payment method
        if options['breakdown']:
            method_totals = (
                payments_before
                .annotate(
                    method_label=Coalesce(
                        'payment_method_name',
                        Value('(No method)'),
                        output_field=CharField(),
                    )
                )
                .values('method_label')
                .annotate(method_total=Sum('amount'))
                .order_by('-method_total')
            )

            if method_totals:
                self.stdout.write('')
                self.stdout.write('Breakdown by payment method:')
                for entry in method_totals:
                    label = entry['method_label']
                    amount = entry['method_total']
                    self.stdout.write(f'  {label:20s} {amount:>12,.2f}')
            else:
                self.stdout.write(
                    self.style.WARNING(
                        'No payments found before this date.'
                    )
                )
