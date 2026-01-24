from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import TaskActivity, Task

@receiver(post_save, sender=TaskActivity)
def update_task_execution_metrics(sender, instance, created, **kwargs):
    """Update task execution tracking fields when activities are created."""
    if not created:
        return
        
    task = instance.task
    
    # Handle ASSIGNMENT
    if instance.type == TaskActivity.ActivityType.ASSIGNMENT:
        # Set first assignment
        if not task.first_assigned_at:
            task.first_assigned_at = instance.timestamp
            
        # Add technician (Technicians and Managers included)
        # Add technician (Technicians and Managers included)
        # Check details for explicitly assigned technician (new format)
        details = instance.details or {}
        new_tech_id = details.get('new_technician_id')
        new_tech_name = details.get('new_technician_name')
        
        if new_tech_id:
             tech_data = {
                'user_id': new_tech_id,
                'name': new_tech_name or 'Unknown',
                'role': 'Technician', # We assume assigned person performs tech role for this task
                'assigned_at': instance.timestamp.isoformat()
            }
             existing_ids = [t.get('user_id') for t in task.execution_technicians]
             if new_tech_id not in existing_ids:
                task.execution_technicians.append(tech_data)

        # Fallback to instance.user if it is a technician/manager performing the action (e.g., self-assignment or legacy)
        # BUT be careful: if Manager assigns to Tech, instance.user is Manager. We don't necessarily want to list Manager as "execution technician" unless they did work?
        # The requirement said "including managers". 
        # If the Manager merely *assigned* it, should they be listed? 
        # "Since technician reassignment is possible... all of the technicians involved should be recognized"
        # Usually implies people who held the task.
        # So we probably should NOT include the actor unless they assigned it to themselves.
        # But for legacy data where we don't have details, we might have no choice or we ignore it?
        # Let's keep existing logic but ONLY if 'new_technician_id' was NOT present (legacy), 
        # AND maybe check if message implies self-assignment? Hard to know.
        # Safer to rely on details for new stuff. For old stuff, we rely on backfill logic.
        
        # However, to be safe and compatible with previous logic:
        elif instance.user and instance.user.role in ['Technician', 'Manager']:
            # Only add if we didn't add a target technician from details
            # And maybe logic to detect if they are just dispatching?
            # For now, let's keep it but it might add dispatchers. 
            # Actually, "execution technicians" usually means assignee.
            # If I assign to you, I didn't execute it.
            # So I should probably REMOVE this fallback for Assignment type if I want only assignees.
            pass
        
        # If this is a reassignment after return, close the open return period
        if task.return_periods:
            last_period = task.return_periods[-1]
            if last_period.get('reassigned_at') is None:
                last_period['reassigned_at'] = instance.timestamp.isoformat()
                # We need to explicitly trigger JSON field update sometimes, though assignment above usually works
                # Re-assigning the specific list index ensures django detects the change
                task.return_periods[-1] = last_period
    
    # Handle RETURNED
    elif instance.type == TaskActivity.ActivityType.RETURNED:
        task.return_count += 1
        # Start a new return period
        task.return_periods.append({
            'returned_at': instance.timestamp.isoformat(),
            'reassigned_at': None  # Will be filled when reassigned
        })
    
    # Handle COMPLETION
    elif instance.type == TaskActivity.ActivityType.STATUS_UPDATE:
        details = instance.details or {}
        # Check for status change to Completed
        # We check details first (new way), then message (legacy way)
        if details.get('new_status') == Task.Status.COMPLETED or instance.message == "Task marked as Completed.":
            # If it wasn't already completed (or we are re-completing, update timestamp to latest)
            task.completed_at = instance.timestamp
            
            # Edge case: If task was returned and then completed without an explicit assignment in between (unlikely but possible)
            # We should close the open return period
            if task.return_periods:
                last_period = task.return_periods[-1]
                if last_period.get('reassigned_at') is None:
                    last_period['reassigned_at'] = instance.timestamp.isoformat()
                    task.return_periods[-1] = last_period

    # Save task with updated metrics
    task.save(update_fields=[
        'first_assigned_at', 
        'completed_at', 
        'return_count', 
        'return_periods',
        'execution_technicians'
    ])
