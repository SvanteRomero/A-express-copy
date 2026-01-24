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
        # Note: We check if user exists to be safe, though activity usually has a user
        if instance.user and instance.user.role in ['Technician', 'Manager']:
            tech_data = {
                'user_id': instance.user.id,
                'name': instance.user.get_full_name(),
                'role': instance.user.role,
                'assigned_at': instance.timestamp.isoformat()
            }
            
            existing_ids = [t.get('user_id') for t in task.execution_technicians]
            if instance.user.id not in existing_ids:
                task.execution_technicians.append(tech_data)
        
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
