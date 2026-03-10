from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import TaskActivity, Task

def _handle_assignment_activity(task, instance):
    """Handle logical updates for ASSIGNMENT activities."""
    if not task.first_assigned_at:
        task.first_assigned_at = instance.timestamp
        
    details = instance.details or {}
    new_tech_id = details.get('new_technician_id')
    new_tech_name = details.get('new_technician_name')
    
    if new_tech_id:
        tech_data = {
            'user_id': new_tech_id,
            'name': new_tech_name or 'Unknown',
            'role': 'Technician',
            'assigned_at': instance.timestamp.isoformat()
        }
        existing_ids = [t.get('user_id') for t in task.execution_technicians]
        if new_tech_id not in existing_ids:
            task.execution_technicians.append(tech_data)
    
    if task.return_periods:
        last_period = task.return_periods[-1]
        if last_period.get('reassigned_at') is None:
            last_period['reassigned_at'] = instance.timestamp.isoformat()
            task.return_periods[-1] = last_period

def _handle_returned_activity(task, instance):
    """Handle logical updates for RETURNED activities."""
    task.return_count += 1
    task.return_periods.append({
        'returned_at': instance.timestamp.isoformat(),
        'reassigned_at': None
    })

def _handle_workshop_activity(task, instance):
    """Handle logical updates for WORKSHOP activities."""
    details = instance.details or {}
    if details.get('workshop_location_id'):
        task.workshop_periods.append({
            'sent_at': instance.timestamp.isoformat(),
            'returned_at': None
        })
    elif details.get('workshop_status') and task.workshop_periods:
        last_period = task.workshop_periods[-1]
        if last_period.get('returned_at') is None:
            last_period['returned_at'] = instance.timestamp.isoformat()
            task.workshop_periods[-1] = last_period

def _close_workshop_period(task, instance):
    if task.workshop_periods:
        last_period = task.workshop_periods[-1]
        if last_period.get('returned_at') is None:
            last_period['returned_at'] = instance.timestamp.isoformat()
            task.workshop_periods[-1] = last_period

def _mark_task_completed(task, instance):
    task.completed_at = instance.timestamp
    if task.return_periods:
        last_period = task.return_periods[-1]
        if last_period.get('reassigned_at') is None:
            last_period['reassigned_at'] = instance.timestamp.isoformat()
            task.return_periods[-1] = last_period

def _handle_status_update_or_ready(task, instance):
    """Handle logical updates for STATUS_UPDATE, READY, or implicit returns from ASSIGNMENT activities."""
    should_close_workshop = False
    is_completed = False
    
    if instance.type == TaskActivity.ActivityType.ASSIGNMENT:
        should_close_workshop = True
    else:
        details = instance.details or {}
        new_status = details.get('new_status')
        message = instance.message or ""
        
        is_completed = new_status == Task.Status.COMPLETED or message == "Task marked as Completed."
        is_ready = new_status == 'Ready for Pickup' or instance.type == TaskActivity.ActivityType.READY
        should_close_workshop = is_completed or is_ready
    
    if should_close_workshop:
        _close_workshop_period(task, instance)

        if is_completed:
            _mark_task_completed(task, instance)

@receiver(post_save, sender=TaskActivity)
def update_task_execution_metrics(sender, instance, created, **kwargs):
    """Update task execution tracking fields when activities are created."""
    if not created:
        return
        
    task = instance.task
    
    if instance.type == TaskActivity.ActivityType.ASSIGNMENT:
        _handle_assignment_activity(task, instance)
    elif instance.type == TaskActivity.ActivityType.RETURNED:
        _handle_returned_activity(task, instance)
    elif instance.type == TaskActivity.ActivityType.WORKSHOP:
        _handle_workshop_activity(task, instance)
    
    # Handle COMPLETION, READY FOR PICKUP, or ASSIGNMENT (Implicit Return from Workshop)
    if instance.type in [TaskActivity.ActivityType.STATUS_UPDATE, TaskActivity.ActivityType.READY, TaskActivity.ActivityType.ASSIGNMENT]:
        _handle_status_update_or_ready(task, instance)

    task.save(update_fields=[
        'first_assigned_at', 
        'completed_at', 
        'return_count', 
        'return_periods',
        'workshop_periods',
        'execution_technicians'
    ])
