"""
Broadcast utilities for the Eapp app.
Handles WebSocket broadcasts for debt requests.
"""

import logging

from notifications.utils import (
    generate_toast_id,
    get_group_for_role,
    _send_to_groups,
)

logger = logging.getLogger(__name__)


def broadcast_debt_request(task, requester, request_id):
    """
    Broadcast a debt request to managers for approval.
    Shows an interactive toast with approve/reject buttons.
    
    Args:
        task: The Task instance
        requester: The User who made the request
        request_id: The DebtRequest ID (integer from database)
    """
    data = {
        'type': 'debt_request',
        'request_id': request_id,
        'task_id': task.title,
        'task_title': task.title,
        'requester_name': requester.get_full_name() or requester.username,
        'requester_id': requester.id,
    }
    
    # Use data.update handler — this is a direct message, not a toast
    _send_to_groups(['notifications_manager'], 'data.update', data)
    logger.info(f"Broadcast debt request {request_id} for task {task.title} to managers")
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
    # 1. Dismiss toast for all managers
    dismiss_data = {
        'type': 'debt_request_resolved',
        'request_id': request_id,
    }
    _send_to_groups(['notifications_manager'], 'data.update', dismiss_data)
    logger.info(f"Broadcast debt request dismissal for {request_id}")
    
    # 2. Notify the requester via toast
    from Eapp.models import User
    try:
        requester = User.objects.get(id=requester_id)
    except User.DoesNotExist:
        logger.warning(f"Requester {requester_id} not found - skipping notification")
        return
    
    requester_group = get_group_for_role(requester.role)
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
    
    # Use toast.notification handler for toast messages
    _send_to_groups(
        [f'notifications_{requester_group}'],
        'toast.notification',
        toast_data
    )
    logger.info(f"Notified requester {requester.username} of debt {'approval' if approved else 'rejection'}")
