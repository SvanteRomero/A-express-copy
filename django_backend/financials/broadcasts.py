"""
Broadcast utilities for the financials app.
Triggers WebSocket updates for live data synchronization.
"""

from notifications.utils import broadcast_task_status_update
import logging

logger = logging.getLogger(__name__)


def broadcast_payment_update(task_id: str = None):
    """
    Broadcast a payment update to trigger cache invalidation.
    Uses the existing task_status_update infrastructure since payments affect tasks.
    
    Args:
        task_id: Optional task title if payment is task-related
    """
    from notifications.utils import get_channel_layer
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    
    if not channel_layer:
        logger.warning("Channel layer not available - skipping payment update broadcast")
        return
    
    data = {
        'type': 'payment_update',
        'task_id': task_id,
    }
    
    # Broadcast to all relevant role groups
    for role in ['manager', 'front_desk', 'accountant']:
        group_name = f'notifications_{role}'
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'data.update',
                    'data': data,
                }
            )
            logger.debug(f"Broadcast payment update to {group_name}")
        except Exception as e:
            logger.error(f"Failed to broadcast payment update to {group_name}: {e}")


def broadcast_account_update():
    """
    Broadcast an account balance update to trigger cache invalidation.
    """
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    
    if not channel_layer:
        logger.warning("Channel layer not available - skipping account update broadcast")
        return
    
    data = {
        'type': 'account_update',
    }
    
    # Broadcast to managers and accountants who see account balances
    for role in ['manager', 'accountant']:
        group_name = f'notifications_{role}'
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'data.update',
                    'data': data,
                }
            )
            logger.debug(f"Broadcast account update to {group_name}")
        except Exception as e:
            logger.error(f"Failed to broadcast account update to {group_name}: {e}")


def broadcast_transaction_request(request_id: int, transaction_type: str, description: str, amount: str, requester_name: str, requester_id: int):
    """
    Broadcast a transaction request to managers for approval.
    This shows an interactive toast with approve/reject buttons.
    
    Args:
        request_id: The ID of the transaction request
        transaction_type: 'Expenditure' or 'Revenue'
        description: Description of the transaction
        amount: Amount requested (as string)
        requester_name: Name of the person who made the request
        requester_id: ID of the person who made the request
    """
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    
    if not channel_layer:
        logger.warning("Channel layer not available - skipping transaction request broadcast")
        return
    
    data = {
        'type': 'transaction_request',
        'request_id': request_id,
        'transaction_type': transaction_type,
        'description': description,
        'amount': amount,
        'requester_name': requester_name,
        'requester_id': requester_id,
    }
    
    # Broadcast only to managers who can approve requests
    group_name = 'notifications_manager'
    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'data.update',
                'data': data,
            }
        )
        logger.info(f"Broadcast {transaction_type} request {request_id} to managers")
    except Exception as e:
        logger.error(f"Failed to broadcast transaction request to managers: {e}")


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
    from notifications.utils import generate_toast_id
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    
    if not channel_layer:
        logger.warning("Channel layer not available - skipping transaction resolved broadcast")
        return
    
    # 1. Dismiss toast for all managers
    dismiss_data = {
        'type': 'transaction_request_resolved',
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
        logger.info(f"Broadcast transaction request dismissal for {request_id}")
    except Exception as e:
        logger.error(f"Failed to broadcast transaction dismissal: {e}")
    
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
        'toast_type': 'transaction_request_approved' if approved else 'transaction_request_rejected',
        'data': {
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
        logger.info(f"Notified requester {requester.username} of transaction {'approval' if approved else 'rejection'}")
    except Exception as e:
        logger.error(f"Failed to notify requester: {e}")


def broadcast_transaction_update():
    """
    Broadcast an update to transaction requests list (created, approved, rejected, deleted).
    Triggers cache invalidation for all who can view transactions.
    """
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    channel_layer = get_channel_layer()

    if not channel_layer:
        logger.warning("Channel layer not available - skipping transaction update broadcast")
        return

    data = {
        'type': 'transaction_update',
    }

    # Broadcast to all roles who can see transaction lists
    for role in ['manager', 'accountant', 'admin']:
        group_name = f'notifications_{role}'
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'data.update',
                    'data': data,
                }
            )
            logger.debug(f"Broadcast transaction update to {group_name}")
        except Exception as e:
            logger.error(f"Failed to broadcast transaction update to {group_name}: {e}")


def broadcast_payment_method_toast(action: str, payment_method_name: str, user_name: str):
    """
    Broadcast a toast notification for payment method CRUD operations.
    
    Args:
        action: The action performed ('created', 'updated', 'deleted')
        payment_method_name: Name of the payment method
        user_name: Name of the user who performed the action
    """
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    from notifications.utils import generate_toast_id

    channel_layer = get_channel_layer()

    if not channel_layer:
        logger.warning("Channel layer not available - skipping payment method toast broadcast")
        return

    toast_data = {
        'type': 'toast_notification',
        'toast_type': f'payment_method_{action}',
        'data': {
            'payment_method_name': payment_method_name,
            'user_name': user_name,
        },
        'id': generate_toast_id(),
    }

    # Broadcast to managers and accountants who can manage payment methods
    for role in ['manager', 'accountant']:
        group_name = f'notifications_{role}'
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'data.update',
                    'data': toast_data,
                }
            )
            logger.info(f"Broadcast payment method {action} toast to {group_name}")
        except Exception as e:
            logger.error(f"Failed to broadcast payment method toast to {group_name}: {e}")


def broadcast_payment_method_update():
    """
    Broadcast a data update to invalidate payment method caches.
    Triggers cache invalidation for all who can view payment methods.
    """
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    channel_layer = get_channel_layer()

    if not channel_layer:
        logger.warning("Channel layer not available - skipping payment method update broadcast")
        return

    data = {
        'type': 'payment_method_update',
    }

    # Broadcast to all authenticated users who see payment method dropdowns
    for role in ['manager', 'accountant', 'front_desk', 'admin']:
        group_name = f'notifications_{role}'
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'data.update',
                    'data': data,
                }
            )
            logger.debug(f"Broadcast payment method update to {group_name}")
        except Exception as e:
            logger.error(f"Failed to broadcast payment method update to {group_name}: {e}")

