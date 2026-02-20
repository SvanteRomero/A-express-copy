from django.core.management.base import BaseCommand
from Eapp.models import Task


class Command(BaseCommand):
    help = 'Clears the is_debt flag on tasks that are Fully Paid'

    def handle(self, *args, **options):
        tasks = Task.objects.filter(is_debt=True, payment_status='Fully Paid')
        count = tasks.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("No fully paid debts found. Nothing to update."))
            return

        self.stdout.write(f"Found {count} fully paid task(s) still flagged as debt. Clearing...")
        updated = tasks.update(is_debt=False)
        self.stdout.write(self.style.SUCCESS(f"Successfully cleared is_debt on {updated} task(s)."))
