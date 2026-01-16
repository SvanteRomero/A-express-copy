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


def broadcast_expenditure_request(request_id: int, description: str, amount: str, requester_name: str):
    """
    Broadcast an expenditure request to managers for approval.
    This shows an interactive toast with approve/reject buttons.
    
    Args:
        request_id: The ID of the expenditure request
        description: Description of the expenditure
        amount: Amount requested (as string)
        requester_name: Name of the person who made the request
    """
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    
    if not channel_layer:
        logger.warning("Channel layer not available - skipping expenditure request broadcast")
        return
    
    data = {
        'type': 'expenditure_request',
        'request_id': request_id,
        'description': description,
        'amount': amount,
        'requester_name': requester_name,
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
        logger.info(f"Broadcast expenditure request {request_id} to managers")
    except Exception as e:
        logger.error(f"Failed to broadcast expenditure request to managers: {e}")


def broadcast_expenditure_update():
    """
    Broadcast an update to expenditure requests list (created, approved, rejected, deleted).
    Triggers cache invalidation for all who can view expenditures.
    """
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    channel_layer = get_channel_layer()

    if not channel_layer:
        logger.warning("Channel layer not available - skipping expenditure update broadcast")
        return

    data = {
        'type': 'expenditure_update',
    }

    # Broadcast to all roles who can see expenditure lists
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
            logger.debug(f"Broadcast expenditure update to {group_name}")
        except Exception as e:
            logger.error(f"Failed to broadcast expenditure update to {group_name}: {e}")
