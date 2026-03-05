"""
Utility functions for broadcasting notifications via WebSocket.
Use these functions from anywhere in the Django app to push notifications.
"""

import logging
import uuid
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

# Centralized role-to-group mapping.
# Used by all broadcast modules to map Django user roles to WebSocket group names.
ROLE_TO_GROUP = {
    'Front Desk': 'front_desk',
    'Accountant': 'accountant',
    'Technician': 'technician',
    'Manager': 'manager',
    'Administrator': 'admin',
}

# All role group names for broadcasting to everyone
ALL_ROLES = ['manager', 'front_desk', 'technician', 'accountant']


def get_group_for_role(role: str) -> str | None:
    """
    Get the WebSocket group name for a Django user role.
    Returns None if role is unknown.
    """
    return ROLE_TO_GROUP.get(role)


def generate_toast_id():
    """
    Generate a unique ID for toast notifications.
    """
    return str(uuid.uuid4())


def _get_channel_layer():
    """Internal helper to get and validate the channel layer."""
    channel_layer = get_channel_layer()
    if not channel_layer:
        logger.warning("Channel layer not available - skipping WebSocket broadcast")
    return channel_layer


def _send_to_groups(groups: list, handler_type: str, data: dict):
    """
    Internal helper to send a message to multiple WebSocket groups.
    
    Args:
        groups: List of group names (e.g., ['notifications_manager', 'user_5'])
        handler_type: The consumer handler type (e.g., 'toast.notification', 'data.update')
        data: The message payload
    """
    channel_layer = _get_channel_layer()
    if not channel_layer:
        return

    for group_name in groups:
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': handler_type,
                    'data': data,
                }
            )
            logger.debug(f"Sent {handler_type} to {group_name}")
        except Exception as e:
            logger.error(f"Failed to send {handler_type} to {group_name}: {e}")


def broadcast_data_update(roles: list, data: dict):
    """
    Broadcast a data update message to trigger cache invalidation on the frontend.
    Uses the 'data.update' handler type.
    
    Args:
        roles: List of normalized role names (e.g., ['manager', 'front_desk'])
        data: Dict with at minimum a 'type' key (e.g., {'type': 'payment_update'})
    """
    groups = [f'notifications_{role}' for role in roles]
    _send_to_groups(groups, 'data.update', data)


def send_to_user_group(user_id: int, handler_type: str, data: dict):
    """
    Send a message to a specific user's personal WebSocket group.
    
    Args:
        user_id: The user's ID
        handler_type: The consumer handler type
        data: The message payload
    """
    _send_to_groups([f'user_{user_id}'], handler_type, data)

def broadcast_scheduler_notification(notification):
    """
    Broadcast a scheduler notification to all managers and front_desk users.
    
    Args:
        notification: SchedulerNotification model instance
    """
    data = {
        'type': 'scheduler_notification',
        'job_type': notification.job_type,
        'tasks_found': notification.tasks_found,
        'messages_sent': notification.messages_sent,
        'messages_failed': notification.messages_failed,
        'failure_details': notification.failure_details,
        'created_at': notification.created_at.isoformat(),
    }
    
    groups = [f'notifications_{role}' for role in ['manager', 'front_desk']]
    _send_to_groups(groups, 'scheduler.notification', data)


def broadcast_task_notification(user_role, notification_data):
    """
    Broadcast a task notification to users of a specific role.
    
    Args:
        user_role: Role to broadcast to ('manager', 'front_desk', etc.)
        notification_data: Dict with notification data
    """
    _send_to_groups(
        [f'notifications_{user_role}'],
        'task.notification',
        notification_data
    )


def broadcast_toast_notification(roles: list, toast_type: str, data: dict = None):
    """
    Broadcast a toast notification to users of specified roles.
    Uses the correct 'toast.notification' handler type.
    
    Args:
        roles: List of roles to broadcast to (e.g., ['manager', 'front_desk'])
        toast_type: Type of toast (e.g., 'task_created', 'task_approved')
        data: Optional additional data for the toast
    """
    message_data = {
        'type': 'toast_notification',
        'id': generate_toast_id(),
        'toast_type': toast_type,
        'data': data or {},
    }
    
    groups = [
        f'notifications_{role.lower().replace(" ", "_")}'
        for role in roles
    ]
    _send_to_groups(groups, 'toast.notification', message_data)


def broadcast_task_status_update(task_id: str, new_status: str, updated_fields: list = None):
    """
    Broadcast a task status update to all connected users.
    Triggers React Query cache invalidation on the frontend.
    
    Args:
        task_id: The task title/ID
        new_status: The new status of the task
        updated_fields: List of field names that were changed
    """
    data = {
        'type': 'task_status_update',
        'task_id': task_id,
        'new_status': new_status,
        'updated_fields': updated_fields or [],
    }
    
    groups = [f'notifications_{role}' for role in ALL_ROLES]
    _send_to_groups(groups, 'task.status.update', data)


def send_toast_to_user(user, toast_type: str, data: dict = None):
    """
    Send a toast notification to a specific user via WebSocket.
    
    Args:
        user: The User object to send to (must have an id)
        toast_type: Type of toast (e.g., 'task_assigned')
        data: Dictionary containing notification details
    """
    message_data = {
        'type': 'toast_notification',
        'id': generate_toast_id(),
        'toast_type': toast_type,
        'data': data or {},
    }
    
    send_to_user_group(user.id, 'toast.notification', message_data)
    logger.debug(f"Sent toast '{toast_type}' to user {user.username} (id={user.id})")

