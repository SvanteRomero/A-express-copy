"""
Utility functions for broadcasting notifications via WebSocket.
Use these functions from anywhere in the Django app to push notifications.
"""

import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def broadcast_scheduler_notification(notification):
    """
    Broadcast a scheduler notification to all managers and front_desk users.
    
    Args:
        notification: SchedulerNotification model instance
    """
    channel_layer = get_channel_layer()
    
    if not channel_layer:
        logger.warning("Channel layer not available - skipping WebSocket broadcast")
        return
    
    data = {
        'type': 'scheduler_notification',
        'job_type': notification.job_type,
        'tasks_found': notification.tasks_found,
        'messages_sent': notification.messages_sent,
        'messages_failed': notification.messages_failed,
        'failure_details': notification.failure_details,
        'created_at': notification.created_at.isoformat(),
    }
    
    # Broadcast to both manager and front_desk groups (using normalized names)
    for role in ['manager', 'front_desk']:
        group_name = f'notifications_{role}'
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'scheduler.notification',  # Calls scheduler_notification handler
                    'data': data,
                }
            )
            logger.info(f"Broadcast scheduler notification to {group_name}")
        except Exception as e:
            logger.error(f"Failed to broadcast to {group_name}: {e}")


def broadcast_task_notification(user_role, notification_data):
    """
    Broadcast a task notification to users of a specific role.
    
    Args:
        user_role: Role to broadcast to ('manager', 'front_desk', etc.)
        notification_data: Dict with notification data
    """
    channel_layer = get_channel_layer()
    
    if not channel_layer:
        logger.warning("Channel layer not available - skipping WebSocket broadcast")
        return
    
    group_name = f'notifications_{user_role}'
    
    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'task.notification',
                'data': notification_data,
            }
        )
        logger.info(f"Broadcast task notification to {group_name}")
    except Exception as e:
        logger.error(f"Failed to broadcast task notification to {group_name}: {e}")


def broadcast_toast_notification(roles: list, toast_type: str, data: dict = None):
    """
    Broadcast a toast notification to users of specified roles.
    This enables instant server-to-client notifications for key events.
    
    Args:
        roles: List of roles to broadcast to (e.g., ['manager', 'front_desk'])
        toast_type: Type of toast (e.g., 'task_created', 'task_approved', 'payment_added')
        data: Optional additional data for the toast
    """
    channel_layer = get_channel_layer()
    
    if not channel_layer:
        logger.warning("Channel layer not available - skipping toast broadcast")
        return
    
    message_data = {
        'type': 'toast_notification',
        'toast_type': toast_type,
        'data': data or {},
    }
    
    for role in roles:
        # Normalize role name (lowercase, replace spaces with underscores)
        normalized_role = role.lower().replace(' ', '_')
        group_name = f'notifications_{normalized_role}'
        
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'toast.notification',  # Calls toast_notification handler
                    'data': message_data,
                }
            )
            logger.debug(f"Broadcast toast '{toast_type}' to {group_name}")
        except Exception as e:
            logger.error(f"Failed to broadcast toast to {group_name}: {e}")


def broadcast_task_status_update(task_id: str, new_status: str, updated_fields: list = None):
    """
    Broadcast a task status update to all connected users.
    This triggers React Query cache invalidation on the frontend for live updates.
    
    Args:
        task_id: The task title/ID
        new_status: The new status of the task
        updated_fields: List of field names that were changed
    """
    channel_layer = get_channel_layer()
    
    if not channel_layer:
        logger.warning("Channel layer not available - skipping task status update broadcast")
        return
    
    data = {
        'type': 'task_status_update',
        'task_id': task_id,
        'new_status': new_status,
        'updated_fields': updated_fields or [],
    }
    
    # Broadcast to all role groups for cross-user visibility
    for role in ['manager', 'front_desk', 'technician', 'accountant']:
        group_name = f'notifications_{role}'
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'task.status.update',  # Calls task_status_update handler
                    'data': data,
                }
            )
            logger.debug(f"Broadcast task status update to {group_name}")
        except Exception as e:
            logger.error(f"Failed to broadcast task status update to {group_name}: {e}")
