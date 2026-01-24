from django.core.management.base import BaseCommand
from django.db.models import Q
from Eapp.models import Task, TaskActivity
from django.db import transaction

class Command(BaseCommand):
    help = 'Backfill execution metrics for existing tasks'

    def handle(self, *args, **options):
        # We process all tasks that don't have first_assigned_at set yet
        # or maybe we should just process all tasks to be safe? 
        # Safer to process all to ensure consistency.
        
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
            
            # 1. First Assignment
            first_assignment_act = activities.filter(type=TaskActivity.ActivityType.ASSIGNMENT).first()
            first_assigned_at = first_assignment_act.timestamp if first_assignment_act else None
            
            # 2. Completion Time
            # Find the LAST status update to 'Completed'
            # Note: A task might be completed multiple times (e.g. reopened then completed). 
            # Usually we want the *final* completion.
            completed_act = activities.filter(
                type=TaskActivity.ActivityType.STATUS_UPDATE
            ).filter(
                Q(details__new_status=Task.Status.COMPLETED) | 
                Q(message="Task marked as Completed.")
            ).last()
            completed_at = completed_act.timestamp if completed_act else None
            
            # 3. Return Count
            return_count = activities.filter(type=TaskActivity.ActivityType.RETURNED).count()
            
            # 4. Execution Technicians (Unique list)
            technicians = []
            seen_tech_ids = set()
            
            # Key fix: Always include the currently assigned technician
            if task.assigned_to:
                user = task.assigned_to
                if user.role in ['Technician', 'Manager']:
                     # Use first_assigned_at or created_at as proxy for assignment time if unknown
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
            
            # Try to add historical technicians if we can identify them (e.g. they acted on the task?)
            # Since user in ASSIGNMENT is the actor, we might skip them if we can't verify they are the tech.
            # But let's keep the logic if they are Technician/Manager, assuming self-assignment or active role?
            # Or better, iterate STATUS_UPDATES which usually implies work done?
            # For now, let's just stick to adding the current assignee as the primary fix. 
            # We can also check if the actor of an ASSIGNMENT was assigning TO THEMSELVES? (user == new_technician_name logic hard)
            
            for act in assignment_acts:
                user = act.user
                # Only add if not already added (e.g. current assignee)
                if user.role in ['Technician', 'Manager'] and user.id not in seen_tech_ids:
                    # HEURISTIC: If a technician assigns a task, are they the one working on it?
                    # Often yes (self-assign). Sometimes no (lead tech assigning to junior).
                    # We'll include them for completeness but this might be noisy.
                    technicians.append({
                        'user_id': user.id,
                        'name': user.get_full_name(),
                        'role': user.role,
                        'assigned_at': act.timestamp.isoformat()
                    })
                    seen_tech_ids.add(user.id)
            
            # 5. Return Periods
            return_periods = []
            # We need to iterate chronologically to pair returns with reassignments
            current_return = None
            
            for act in activities:
                if act.type == TaskActivity.ActivityType.RETURNED:
                    # If we already have an open return, ignore this (duplicate return?) or treat as reset?
                    # Let's assume simplest case: New return event starts a period.
                    if current_return:
                         # Force close previous open return with this timestamp? No, that implies 0 duration?
                         # Let's keep the *first* return timestamp of a sequence.
                         pass
                    else:
                        current_return = {'returned_at': act.timestamp.isoformat(), 'reassigned_at': None}
                
                elif act.type == TaskActivity.ActivityType.ASSIGNMENT:
                    if current_return:
                        # This assignment closes the return period
                        current_return['reassigned_at'] = act.timestamp.isoformat()
                        return_periods.append(current_return)
                        current_return = None
            
            if current_return:
                return_periods.append(current_return)


            
            # REFACTOR: Iterate all activities chronologically to handle interleaving
            workshop_periods = []
            current_workshop = None
            
            # Re-fetch all activities sorted
            all_activities = task.activities.all().order_by('timestamp')
            
            for act in all_activities:
                details = act.details or {}
                message = act.message or ""
                
                # Start Workshop
                if act.type == TaskActivity.ActivityType.WORKSHOP and (details.get('workshop_location_id') or "Task sent to workshop" in message):
                     if not current_workshop:
                         current_workshop = {'sent_at': act.timestamp.isoformat(), 'returned_at': None}
                
                # End Workshop (Explicit)
                elif act.type == TaskActivity.ActivityType.WORKSHOP and (details.get('workshop_status') or "Task returned from workshop" in message):
                    if current_workshop:
                        current_workshop['returned_at'] = act.timestamp.isoformat()
                        workshop_periods.append(current_workshop)
                        current_workshop = None
                
                # End Workshop (Implicit - Ready, Completed, or Assigned)
                elif (act.type == TaskActivity.ActivityType.READY) or \
                     (act.type == TaskActivity.ActivityType.ASSIGNMENT) or \
                     (act.type == TaskActivity.ActivityType.STATUS_UPDATE and \
                      (details.get('new_status') == Task.Status.COMPLETED or \
                       details.get('new_status') == 'Ready for Pickup' or \
                       "Task marked as Completed" in message)):
                       
                     if current_workshop:
                        current_workshop['returned_at'] = act.timestamp.isoformat()
                        workshop_periods.append(current_workshop)
                        current_workshop = None

            if current_workshop:
                # If still open, append as is (report will handle it using completed_at or 'now')
                workshop_periods.append(current_workshop)

            # Update fields
            # Check if any changes needed to avoid unnecessary database writes
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
                
            # JSON comparisons might be tricky depending on exact formatting, but simple equality check usually works
            if len(task.execution_technicians) != len(technicians) or has_changes: # optimize check
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
                updated_count += 1
                
        self.stdout.write(self.style.SUCCESS(f"Backfill complete! Updated {updated_count} tasks."))
