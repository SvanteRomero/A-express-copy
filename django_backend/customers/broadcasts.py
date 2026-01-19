"""
Broadcast utilities for the customers app.
Triggers WebSocket updates for live data synchronization.
"""

import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def broadcast_customer_update(customer_id: int = None):
    """
    Broadcast a customer update to trigger cache invalidation.
    
    Args:
        customer_id: Optional customer ID for targeted updates
    """
    channel_layer = get_channel_layer()
    
    if not channel_layer:
        logger.warning("Channel layer not available - skipping customer update broadcast")
        return
    
    data = {
        'type': 'customer_update',
        'customer_id': customer_id,
    }
    
    # Broadcast to roles that view customer data
    for role in ['manager', 'front_desk']:
        group_name = f'notifications_{role}'
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'data.update',
                    'data': data,
                }
            )
            logger.debug(f"Broadcast customer update to {group_name}")
        except Exception as e:
            logger.error(f"Failed to broadcast customer update to {group_name}: {e}")
