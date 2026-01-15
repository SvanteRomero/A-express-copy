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
