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
    def return_from_workshop(task, workshop_status, user):
        """
        Return a task from the workshop.
        
        This method:
        - Restores assignment to original technician if available
        - Clears workshop-related fields
        - Creates activity log
        
        Args:
            task: Task instance
            workshop_status: Workshop status ('Solved' or 'Not Solved')
            user: User performing the action
            
        Returns:
            Task: Updated task instance
        """
        # On return, restore assignment from the workshop activity if available
        if task.original_technician:
            task.assigned_to = task.original_technician
        
        # Restore original location from snapshot (both FK references now)
        if task.original_location_snapshot:
            task.current_location = task.original_location_snapshot
        
        # Clear workshop fields
        task.workshop_location = None
        task.workshop_status = None
        
        task.save(update_fields=[
            'assigned_to',
            'current_location',
            'workshop_location',
            'workshop_status'
        ])
        
        # Log the activity
        ActivityLogger.log_workshop_return(task, user, workshop_status)
        
        return task
    
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
