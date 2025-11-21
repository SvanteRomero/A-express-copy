from django.core.management.base import BaseCommand
from Eapp.seeders import seed_tasks, clear_tasks

class Command(BaseCommand):
    help = 'Seed the database with sample tasks and activities across different months and years'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing tasks and activities before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            clear_tasks()
            
        seed_tasks()
        
        self.stdout.write(
            self.style.SUCCESS('Successfully seeded tasks and activities!')
        )