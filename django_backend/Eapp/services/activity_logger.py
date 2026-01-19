"""
Activity Logger Service

Centralized service for creating TaskActivity records with consistent
formatting and metadata handling.
"""
from django.utils import timezone
from Eapp.models import TaskActivity


class ActivityLogger:
    """Centralized activity logging for tasks."""
    
    @staticmethod
    def log_intake(task, user, notes=None):
        """
        Log task intake activity.
        
        Args:
            task: Task instance
            user: User who performed the action
            notes: Optional notes about the intake
        """
        message = "Task has been taken in."
        if notes:
            message += f" Notes: {notes}"
        
        return TaskActivity.objects.create(
            task=task,
            user=user,
            type=TaskActivity.ActivityType.INTAKE,
            message=message
        )
    
    @staticmethod
    def log_device_note(task, user, notes):
        """
        Log device notes activity.
        
        Args:
            task: Task instance
            user: User who performed the action
            notes: Device notes
        """
        return TaskActivity.objects.create(
            task=task,
            user=user,
            type=TaskActivity.ActivityType.DEVICE_NOTE,
            message=f"Device Notes: {notes}"
        )
    
    @staticmethod
    def log_assignment(task, user, old_technician=None, new_technician=None):
        """
        Log task assignment or reassignment activity.
        
        Args:
            task: Task instance
            user: User who performed the action
            old_technician: Previous technician (None if initial assignment)
            new_technician: New technician (None if unassignment)
        """
        if new_technician:
            if old_technician and old_technician != new_technician:
                message = (
                    f"Task reassigned from {old_technician.get_full_name()} "
                    f"to {new_technician.get_full_name()} by {user.get_full_name()}."
                )
            else:
                message = f"Task assigned to {new_technician.get_full_name()} by {user.get_full_name()}."
        else:
            if old_technician:
                message = f"Task unassigned from {old_technician.get_full_name()} by {user.get_full_name()}."
            else:
                return  # No change, don't log
        
        return TaskActivity.objects.create(
            task=task,
            user=user,
            type=TaskActivity.ActivityType.ASSIGNMENT,
            message=message
        )
    
    @staticmethod
    def log_status_change(task, user, new_status):
        """
        Log task status change activity.
        
        Args:
            task: Task instance
            user: User who performed the action
            new_status: New status value
        """
        activity_messages = {
            'Picked Up': "Task has been picked up by the customer.",
            'Completed': "Task marked as Completed.",
            'Ready for Pickup': "Task has been approved and is ready for pickup."
        }
        
        if new_status not in activity_messages:
            return None
        
        activity_type = TaskActivity.ActivityType.STATUS_UPDATE
        details = None
        
        if new_status == 'Picked Up':
            activity_type = TaskActivity.ActivityType.PICKED_UP
            pickup_time = timezone.now()
            details = {
                'pickup_by_id': user.id,
                'pickup_by_name': user.get_full_name(),
                'pickup_at': pickup_time.isoformat()
            }
            # Update pickup snapshot fields
            task.latest_pickup_at = pickup_time
            task.latest_pickup_by = user
            task.save(update_fields=['latest_pickup_at', 'latest_pickup_by'])
        elif new_status == 'Ready for Pickup':
            activity_type = TaskActivity.ActivityType.READY
        
        return TaskActivity.objects.create(
            task=task,
            user=user,
            type=activity_type,
            message=activity_messages[new_status],
            details=details
        )
    
    @staticmethod
    def log_workshop_send(task, user, location, technician):
        """
        Log workshop send activity.
        
        Args:
            task: Task instance
            user: User who performed the action
            location: Workshop location instance
            technician: Workshop technician instance
        """
        details = {
            'workshop_technician_id': technician.id,
            'workshop_technician_name': technician.get_full_name(),
            'workshop_location_id': location.id,
            'workshop_location_name': location.name,
        }
        
        message = (
            f"Task sent to workshop technician {technician.get_full_name()} "
            f"at {location.name}."
        )
        
        return TaskActivity.objects.create(
            task=task,
            user=user,
            type=TaskActivity.ActivityType.WORKSHOP,
            message=message,
            details=details
        )
    
    @staticmethod
    def log_workshop_return(task, user, workshop_status):
        """
        Log workshop return activity.
        
        Args:
            task: Task instance
            user: User who performed the action
            workshop_status: Workshop status (Solved/Not Solved)
        """
        details = {'workshop_status': workshop_status}
        message = f"Task returned from workshop with status: {workshop_status}."
        
        return TaskActivity.objects.create(
            task=task,
            user=user,
            type=TaskActivity.ActivityType.WORKSHOP,
            message=message,
            details=details
        )
    
    @staticmethod
    def log_rejection(task, user, qc_notes):
        """
        Log task rejection activity.
        
        Args:
            task: Task instance
            user: User who performed the action
            qc_notes: Quality control notes explaining rejection
        """
        message = f"Task rejected by {user.get_full_name()} with notes: {qc_notes}"
        
        return TaskActivity.objects.create(
            task=task,
            user=user,
            type=TaskActivity.ActivityType.REJECTED,
            message=message
        )
    
    @staticmethod
    def log_debt_marking(task, user):
        """
        Log task marked as debt activity.
        
        Args:
            task: Task instance
            user: User who performed the action
        """
        return TaskActivity.objects.create(
            task=task,
            user=user,
            type=TaskActivity.ActivityType.STATUS_UPDATE,
            message="Task marked as debt."
        )
    
    @staticmethod
    def log_returned_task_assignment(task, user, technician):
        """
        Log returned task assignment activity.
        
        Args:
            task: Task instance
            user: User who performed the action
            technician: Technician assigned to returned task
        """
        message = f"Returned task assigned to {technician.get_full_name()}."
        
        return TaskActivity.objects.create(
            task=task,
            user=user,
            type=TaskActivity.ActivityType.ASSIGNMENT,
            message=message
        )
