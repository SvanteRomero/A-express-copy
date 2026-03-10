from django.core.management.base import BaseCommand
from django.db.models import Q
from Eapp.models import Task, TaskActivity
from django.db import transaction

class Command(BaseCommand):
    help = 'Backfill execution metrics for existing tasks'

    def handle(self, *args, **options):
        self.stdout.write("Starting backfill of task execution metrics...")
        
        tasks_qs = Task.objects.prefetch_related('activities', 'activities__user').all()
        total_tasks = tasks_qs.count()
        processed = 0
        updated_count = 0
        
        for task in tasks_qs.iterator(chunk_size=100):
            processed += 1
            if processed % 100 == 0:
                self.stdout.write(f"Processed {processed}/{total_tasks} tasks...")
            
            activities = task.activities.all().order_by('timestamp')
            
            first_assigned_at = self._get_first_assignment_time(activities)
            completed_at = self._get_completion_time(activities)
            return_count = activities.filter(type=TaskActivity.ActivityType.RETURNED).count()
            technicians = self._get_execution_technicians(task, activities)
            return_periods = self._get_return_periods(activities)
            workshop_periods = self._get_workshop_periods(activities)
            
            if self._update_task_fields(
                task, first_assigned_at, completed_at, return_count,
                technicians, return_periods, workshop_periods
            ):
                updated_count += 1
                
        self.stdout.write(self.style.SUCCESS(f"Backfill complete! Updated {updated_count} tasks."))

    def _get_first_assignment_time(self, activities):
        first_assignment_act = activities.filter(type=TaskActivity.ActivityType.ASSIGNMENT).first()
        return first_assignment_act.timestamp if first_assignment_act else None

    def _get_completion_time(self, activities):
        completed_act = activities.filter(
            type=TaskActivity.ActivityType.STATUS_UPDATE
        ).filter(
            Q(details__new_status=Task.Status.COMPLETED) | 
            Q(message="Task marked as Completed.")
        ).last()
        return completed_act.timestamp if completed_act else None

    def _get_execution_technicians(self, task, activities):
        technicians = []
        seen_tech_ids = set()
        
        if task.assigned_to:
            user = task.assigned_to
            if user.role in ['Technician', 'Manager']:
                 assigned_at = task.first_assigned_at or task.created_at
                 technicians.append({
                    'user_id': user.id,
                    'name': user.get_full_name(),
                    'role': user.role,
                    'assigned_at': assigned_at.isoformat() if assigned_at else None
                })
                 seen_tech_ids.add(user.id)

        assignment_acts = activities.filter(
            type=TaskActivity.ActivityType.ASSIGNMENT,
            user__isnull=False
        )
        
        for act in assignment_acts:
            user = act.user
            if user.role in ['Technician', 'Manager'] and user.id not in seen_tech_ids:
                technicians.append({
                    'user_id': user.id,
                    'name': user.get_full_name(),
                    'role': user.role,
                    'assigned_at': act.timestamp.isoformat()
                })
                seen_tech_ids.add(user.id)
                
        return technicians

    def _get_return_periods(self, activities):
        return_periods = []
        current_return = None
        
        for act in activities:
            if act.type == TaskActivity.ActivityType.RETURNED:
                if not current_return:
                    current_return = {'returned_at': act.timestamp.isoformat(), 'reassigned_at': None}
            elif act.type == TaskActivity.ActivityType.ASSIGNMENT:
                if current_return:
                    current_return['reassigned_at'] = act.timestamp.isoformat()
                    return_periods.append(current_return)
                    current_return = None
        
        if current_return:
            return_periods.append(current_return)
            
        return return_periods

    def _is_workshop_started(self, act, details, message):
        return act.type == TaskActivity.ActivityType.WORKSHOP and (
            details.get('workshop_location_id') or "Task sent to workshop" in message
        )

    def _is_workshop_ended(self, act, details, message):
        if act.type == TaskActivity.ActivityType.WORKSHOP and (
            details.get('workshop_status') or "Task returned from workshop" in message
        ):
            return True
        if act.type in (TaskActivity.ActivityType.READY, TaskActivity.ActivityType.ASSIGNMENT):
            return True
        if act.type == TaskActivity.ActivityType.STATUS_UPDATE and (
            details.get('new_status') in (Task.Status.COMPLETED, 'Ready for Pickup') or
            "Task marked as Completed" in message
        ):
            return True
        return False

    def _get_workshop_periods(self, activities):
        workshop_periods = []
        current_workshop = None
        
        for act in activities:
            details = act.details or {}
            message = act.message or ""
            
            if not current_workshop and self._is_workshop_started(act, details, message):
                current_workshop = {'sent_at': act.timestamp.isoformat(), 'returned_at': None}
            elif current_workshop and self._is_workshop_ended(act, details, message):
                current_workshop['returned_at'] = act.timestamp.isoformat()
                workshop_periods.append(current_workshop)
                current_workshop = None

        if current_workshop:
            workshop_periods.append(current_workshop)
            
        return workshop_periods

    def _update_task_fields(self, task, first_assigned_at, completed_at, return_count, technicians, return_periods, workshop_periods):
        has_changes = False
        
        if task.first_assigned_at != first_assigned_at:
            task.first_assigned_at = first_assigned_at
            has_changes = True
            
        if task.completed_at != completed_at:
            task.completed_at = completed_at
            has_changes = True
            
        if task.return_count != return_count:
            task.return_count = return_count
            has_changes = True
            
        if len(task.execution_technicians) != len(technicians) or has_changes:
             task.execution_technicians = technicians
             has_changes = True
             
        if len(task.return_periods) != len(return_periods) or has_changes:
            task.return_periods = return_periods
            has_changes = True

        if len(task.workshop_periods) != len(workshop_periods) or has_changes:
            task.workshop_periods = workshop_periods
            has_changes = True
        
        if has_changes:
            task.save(update_fields=[
                'first_assigned_at', 
                'completed_at', 
                'return_count', 
                'return_periods',
                'workshop_periods',
                'execution_technicians'
            ])
            return True
        return False
