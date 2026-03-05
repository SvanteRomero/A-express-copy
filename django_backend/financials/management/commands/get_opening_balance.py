import os
from datetime import datetime

import psycopg2
from django.core.management.base import BaseCommand
from django.utils import timezone


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

    def _get_connection(self):
        """
        Return a psycopg2 connection, preferring DATABASE_PUBLIC_URL
        for local/CLI use, falling back to DATABASE_URL.
        """
        url = (
            os.environ.get('DATABASE_PUBLIC_URL')
            or os.environ.get('DATABASE_URL')
        )
        if not url:
            raise RuntimeError(
                'Neither DATABASE_PUBLIC_URL nor DATABASE_URL is set.'
            )
        return psycopg2.connect(url)

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

        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                # Opening balance = sum of all payments before target date
                cur.execute(
                    'SELECT COALESCE(SUM(amount), 0) '
                    'FROM financials_payment WHERE date < %s',
                    [target_date],
                )
                total = cur.fetchone()[0]

                self.stdout.write(
                    self.style.SUCCESS(
                        f'Opening balance for {target_date}: {total:,.2f}'
                    )
                )

                # Optional breakdown by payment method
                if options['breakdown']:
                    cur.execute(
                        'SELECT COALESCE(payment_method_name, %(fallback)s), '
                        '       SUM(amount) '
                        'FROM financials_payment '
                        'WHERE date < %(dt)s '
                        'GROUP BY payment_method_name '
                        'ORDER BY SUM(amount) DESC',
                        {'dt': target_date, 'fallback': '(No method)'},
                    )
                    rows = cur.fetchall()

                    if rows:
                        self.stdout.write('')
                        self.stdout.write('Breakdown by payment method:')
                        for label, amount in rows:
                            self.stdout.write(
                                f'  {label:20s} {amount:>12,.2f}'
                            )
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                'No payments found before this date.'
                            )
                        )
        finally:
            conn.close()
