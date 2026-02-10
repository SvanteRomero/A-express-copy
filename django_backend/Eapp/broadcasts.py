"""
Broadcast utilities for the Eapp app.
Handles WebSocket broadcasts for debt requests.
"""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import logging
import uuid

logger = logging.getLogger(__name__)


def generate_debt_request_id():
    """Generate a unique ID for tracking debt request toasts."""
    return str(uuid.uuid4())


def broadcast_debt_request(task, requester, request_id):
    """
    Broadcast a debt request to managers for approval.
    Shows an interactive toast with approve/reject buttons.
    
    Args:
        task: The Task instance
        requester: The User who made the request
        request_id: The DebtRequest ID (integer from database)
    """
    channel_layer = get_channel_layer()
    
    if not channel_layer:
        logger.warning("Channel layer not available - skipping debt request broadcast")
        return None
    
    data = {
        'type': 'debt_request',
        'request_id': request_id,  # Now an integer from DebtRequest.id
        'task_id': task.title,
        'task_title': task.title,
        'requester_name': requester.get_full_name() or requester.username,
        'requester_id': requester.id,
    }
    
    # Broadcast to managers who can approve requests
    group_name = 'notifications_manager'
    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'data.update',
                'data': data,
            }
        )
        logger.info(f"Broadcast debt request {request_id} for task {task.title} to managers")
    except Exception as e:
        logger.error(f"Failed to broadcast debt request to managers: {e}")
        return None
    
    return request_id


def broadcast_debt_resolved(task, approved: bool, approver, requester_id: int, request_id: str):
    """
    Broadcast debt request resolution.
    1. Dismisses toast for all managers
    2. Notifies the requester of the outcome
    
    Args:
        task: The Task instance
        approved: Whether the request was approved
        approver: The User who approved/rejected
        requester_id: ID of the user who made the request
        request_id: The unique ID of the debt request toast
    """
    from notifications.utils import generate_toast_id
    
    channel_layer = get_channel_layer()
    
    if not channel_layer:
        logger.warning("Channel layer not available - skipping debt resolved broadcast")
        return
    
    # 1. Dismiss toast for all managers
    dismiss_data = {
        'type': 'debt_request_resolved',
        'request_id': request_id,
    }
    
    try:
        async_to_sync(channel_layer.group_send)(
            'notifications_manager',
            {
                'type': 'data.update',
                'data': dismiss_data,
            }
        )
        logger.info(f"Broadcast debt request dismissal for {request_id}")
    except Exception as e:
        logger.error(f"Failed to broadcast debt dismissal: {e}")
    
    # 2. Notify the requester
    from Eapp.models import User
    try:
        requester = User.objects.get(id=requester_id)
    except User.DoesNotExist:
        logger.warning(f"Requester {requester_id} not found - skipping notification")
        return
    
    # Map role to group name
    role_to_group = {
        'Front Desk': 'front_desk',
        'Accountant': 'accountant',
        'Technician': 'technician',
        'Manager': 'manager',
        'Administrator': 'admin',
    }
    requester_group = role_to_group.get(requester.role)
    
    if not requester_group:
        logger.warning(f"Unknown role {requester.role} - skipping notification")
        return
    
    approver_name = approver.get_full_name() or approver.username
    
    toast_data = {
        'type': 'toast_notification',
        'id': generate_toast_id(),
        'toast_type': 'debt_request_approved' if approved else 'debt_request_rejected',
        'data': {
            'task_title': task.title,
            'approver_name': approver_name,
        },
    }
    
    try:
        async_to_sync(channel_layer.group_send)(
            f'notifications_{requester_group}',
            {
                'type': 'data.update',
                'data': toast_data,
            }
        )
        logger.info(f"Notified requester {requester.username} of debt {'approval' if approved else 'rejection'}")
    except Exception as e:
        logger.error(f"Failed to notify requester: {e}")
