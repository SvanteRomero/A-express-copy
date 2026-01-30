"""
Workshop Handler Service

Handles workshop-specific business logic including:
- Sending tasks to workshop
- Returning tasks from workshop
- Managing workshop snapshots and state
"""
from django.shortcuts import get_object_or_404
from common.models import Location
from users.models import User
from .activity_logger import ActivityLogger


class WorkshopHandler:
    """Handles workshop-specific operations for tasks."""
    
    @staticmethod
    def send_to_workshop(task, location_id, user):
        """
        Send a task to the workshop.
        
        This method:
        - Sets workshop_status to 'In Workshop'
        - Assigns workshop location
        - Updates current_location
        - Populates snapshot fields (on first send)
        - Creates activity log
        
        Args:
            task: Task instance
            location_id: Workshop location ID
            user: User performing the action
            
        Returns:
            Task: Updated task instance
        """
        workshop_location = get_object_or_404(Location, id=location_id)
        
        # Populate snapshot fields (first send) BEFORE changing location
        if not task.original_technician_snapshot:
            task.original_technician_snapshot = user
        if not task.original_location_snapshot:
            task.original_location_snapshot = task.current_location  # Both are now FK references
        
        # Update task workshop fields
        task.workshop_status = 'In Workshop'
        task.workshop_location = workshop_location
        task.current_location = workshop_location  # Assign the Location object directly
        
        task.save(update_fields=[
            'workshop_status',
            'workshop_location',
            'current_location',
            'original_technician_snapshot',
            'original_location_snapshot'
        ])
        
        # Log the activity
        ActivityLogger.log_workshop_send(task, user, workshop_location)
        
        return task
    
    @staticmethod
    def return_from_workshop(task, workshop_status, user, to_be_checked=False):
        """
        Return a task from the workshop.
        
        This method:
        - Restores assignment to original technician if available
        - Sets workshop_status to the outcome (Solved/Not Solved)
        - Sets to_be_checked flag if verification is required
        - Clears workshop location
        - Creates activity log
        
        Args:
            task: Task instance
            workshop_status: Workshop status ('Solved' or 'Not Solved')
            user: User performing the action
            to_be_checked: If True, requires verification by original technician
            
        Returns:
            Task: Updated task instance
        """
        # On return, restore assignment from the workshop activity if available
        if task.original_technician:
            task.assigned_to = task.original_technician
        
        # Restore original location from snapshot (both FK references now)
        if task.original_location_snapshot:
            task.current_location = task.original_location_snapshot
        
        # Set workshop status to the outcome and clear location
        task.workshop_location = None
        task.workshop_status = workshop_status  # Keep outcome (Solved/Not Solved)
        task.to_be_checked = to_be_checked
        
        task.save(update_fields=[
            'assigned_to',
            'current_location',
            'workshop_location',
            'workshop_status',
            'to_be_checked'
        ])
        
        # Log the activity
        ActivityLogger.log_workshop_return(task, user, workshop_status)
        
        return task
    
    @staticmethod
    def verify_workshop_outcome(task, agrees: bool, user):
        """
        Original technician verifies workshop outcome.
        
        If agrees: clears to_be_checked flag, keeps workshop_status
        If disagrees: sends task back to workshop for do-over
        
        Args:
            task: Task instance
            agrees: True if technician confirms workshop assessment
            user: User performing verification
            
        Returns:
            Tuple[Task, str]: Updated task instance and previous workshop_status
        """
        previous_status = task.workshop_status
        
        if agrees:
            # Just clear the flag, keep the workshop_status
            task.to_be_checked = False
            task.save(update_fields=['to_be_checked'])
            ActivityLogger.log_verification_confirmed(task, user, previous_status)
        else:
            # Reset workshop_status to 'In Workshop' for do-over
            # Use the workshop_location if still set, otherwise use original_location_snapshot
            workshop_location = task.workshop_location or task.original_location_snapshot
            
            task.workshop_status = 'In Workshop'
            task.to_be_checked = False
            task.current_location = workshop_location
            task.workshop_location = workshop_location
            
            task.save(update_fields=[
                'workshop_status', 
                'to_be_checked',
                'current_location',
                'workshop_location'
            ])
            ActivityLogger.log_verification_disputed(task, user, previous_status)
        
        return task, previous_status
    
    @staticmethod
    def update_snapshots_from_activity(task, activity):
        """
        Update task snapshot fields from a workshop activity.
        
        Used when activities are added manually to ensure snapshots are populated.
        
        Args:
            task: Task instance
            activity: TaskActivity instance
        """
        if activity.type != 'WORKSHOP':
            return
        
        details = activity.details or {}
        updated = False
        
        # Set original snapshots if missing
        if not task.original_technician_snapshot:
            task.original_technician_snapshot = activity.user
            updated = True
        
        # For location snapshot, try to get Location object from details
        if not task.original_location_snapshot and details.get('workshop_location_id'):
            from common.models import Location
            try:
                location = Location.objects.get(id=details.get('workshop_location_id'))
                task.original_location_snapshot = location
                updated = True
            except Location.DoesNotExist:
                pass  # Skip if location no longer exists
        
        if updated:
            task.save(update_fields=['original_technician_snapshot', 'original_location_snapshot'])
