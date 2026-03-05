"""
Broadcast utilities for the financials app.
Triggers WebSocket updates for live data synchronization.
"""

import logging

from notifications.utils import (
    generate_toast_id,
    get_group_for_role,
    broadcast_data_update,
    broadcast_toast_notification,
    _send_to_groups,
)

logger = logging.getLogger(__name__)


def broadcast_payment_update(task_id: str = None):
    """
    Broadcast a payment update to trigger cache invalidation.
    
    Args:
        task_id: Optional task title if payment is task-related
    """
    broadcast_data_update(
        roles=['manager', 'front_desk', 'accountant'],
        data={'type': 'payment_update', 'task_id': task_id}
    )


def broadcast_account_update():
    """
    Broadcast an account balance update to trigger cache invalidation.
    """
    broadcast_data_update(
        roles=['manager', 'accountant'],
        data={'type': 'account_update'}
    )


def broadcast_transaction_request(request_id: int, transaction_type: str, description: str, amount: str, requester_name: str, requester_id: int):
    """
    Broadcast a transaction request to managers for approval.
    Shows an interactive toast with approve/reject buttons.
    
    Args:
        request_id: The ID of the transaction request
        transaction_type: 'Expenditure' or 'Revenue'
        description: Description of the transaction
        amount: Amount requested (as string)
        requester_name: Name of the person who made the request
        requester_id: ID of the person who made the request
    """
    data = {
        'type': 'transaction_request',
        'request_id': request_id,
        'transaction_type': transaction_type,
        'description': description,
        'amount': amount,
        'requester_name': requester_name,
        'requester_id': requester_id,
    }
    
    # Use data.update handler — this is a direct message, not a toast
    _send_to_groups(['notifications_manager'], 'data.update', data)
    logger.info(f"Broadcast {transaction_type} request {request_id} to managers")


def broadcast_transaction_resolved(request_id: int, approved: bool, approver, requester_id: int):
    """
    Broadcast transaction request resolution.
    1. Dismisses toast for all managers
    2. Notifies the requester of the outcome
    
    Args:
        request_id: The ID of the transaction request
        approved: Whether the request was approved
        approver: The User who approved/rejected
        requester_id: ID of the user who made the request
    """
    # 1. Dismiss toast for all managers
    dismiss_data = {
        'type': 'transaction_request_resolved',
        'request_id': request_id,
    }
    _send_to_groups(['notifications_manager'], 'data.update', dismiss_data)
    logger.info(f"Broadcast transaction request dismissal for {request_id}")
    
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
        'toast_type': 'transaction_request_approved' if approved else 'transaction_request_rejected',
        'data': {
            'approver_name': approver_name,
        },
    }
    
    # Use toast.notification handler for toast messages
    _send_to_groups(
        [f'notifications_{requester_group}'],
        'toast.notification',
        toast_data
    )
    logger.info(f"Notified requester {requester.username} of transaction {'approval' if approved else 'rejection'}")


def broadcast_transaction_update():
    """
    Broadcast an update to transaction requests list (created, approved, rejected, deleted).
    Triggers cache invalidation for all who can view transactions.
    """
    broadcast_data_update(
        roles=['manager', 'accountant', 'admin'],
        data={'type': 'transaction_update'}
    )


def broadcast_payment_method_toast(action: str, payment_method_name: str, user_name: str):
    """
    Broadcast a toast notification for payment method CRUD operations.
    
    Args:
        action: The action performed ('created', 'updated', 'deleted')
        payment_method_name: Name of the payment method
        user_name: Name of the user who performed the action
    """
    broadcast_toast_notification(
        roles=['manager', 'accountant'],
        toast_type=f'payment_method_{action}',
        data={
            'payment_method_name': payment_method_name,
            'user_name': user_name,
        }
    )


def broadcast_payment_method_update():
    """
    Broadcast a data update to invalidate payment method caches.
    Triggers cache invalidation for all who can view payment methods.
    """
    broadcast_data_update(
        roles=['manager', 'accountant', 'front_desk', 'admin'],
        data={'type': 'payment_method_update'}
    )
