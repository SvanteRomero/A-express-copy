"""
Broadcast utilities for the customers app.
Triggers WebSocket updates for live data synchronization.
"""

import logging
from notifications.utils import broadcast_data_update

logger = logging.getLogger(__name__)


def broadcast_customer_update(customer_id: int = None):
    """
    Broadcast a customer update to trigger cache invalidation.
    
    Args:
        customer_id: Optional customer ID for targeted updates
    """
    broadcast_data_update(
        roles=['manager', 'front_desk'],
        data={'type': 'customer_update', 'customer_id': customer_id}
    )
