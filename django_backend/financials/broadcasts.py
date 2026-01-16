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
