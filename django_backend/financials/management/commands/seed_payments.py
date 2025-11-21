from django.core.management.base import BaseCommand
from Eapp.financials.seeders import seed_payments, clear_payments

class Command(BaseCommand):
    help = 'Seed the database with payments for tasks'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing payments before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            clear_payments()
            
        seed_payments()
        
        self.stdout.write(
            self.style.SUCCESS('Successfully seeded payments!')
        )