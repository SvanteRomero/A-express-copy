from django.core.management.base import BaseCommand
from Eapp.models import Task, TaskActivity
from django.db.models import Subquery, OuterRef

class Command(BaseCommand):
    help = 'Backfills ready_for_pickup_at for tasks'

    def handle(self, *args, **options):
        tasks = Task.objects.filter(
            status='Ready for Pickup',
            ready_for_pickup_at__isnull=True
        )
        
        count = 0
        self.stdout.write(f"Found {tasks.count()} tasks to backfill...")
        
        for task in tasks:
            # Find the latest READY activity
            last_ready = task.activities.filter(
                type=TaskActivity.ActivityType.READY
            ).order_by('-timestamp').first()
            
            if last_ready:
                task.ready_for_pickup_at = last_ready.timestamp
                task.save(update_fields=['ready_for_pickup_at'])
                count += 1
            else:
                # Fallback: Try to find status update to "Ready for Pickup"
                # This handles cases before ACTIVITY_TYPE.READY might have been used explicitly
                status_update = task.activities.filter(
                    type=TaskActivity.ActivityType.STATUS_UPDATE,
                    message__icontains="Ready for Pickup"
                ).order_by('-timestamp').first()
                
                if status_update:
                    task.ready_for_pickup_at = status_update.timestamp
                    task.save(update_fields=['ready_for_pickup_at'])
                    count += 1
                else:
                    self.stdout.write(self.style.WARNING(f"Could not find READY activity for task {task.id}"))

        self.stdout.write(self.style.SUCCESS(f"Successfully backfilled {count} tasks."))
