"""
Django signals for the customers app.
Handles WebSocket broadcasts for live data synchronization.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Customer


@receiver([post_save, post_delete], sender=Customer)
def broadcast_customer_change(sender, instance, **kwargs):
    """Broadcast customer changes for live updates across clients."""
    from .broadcasts import broadcast_customer_update
    broadcast_customer_update(customer_id=instance.id)
