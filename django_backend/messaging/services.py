"""
Messaging services - orchestration layer for SMS operations.
Uses modular components for client, templates, and message building.
"""
import logging

from messaging.sms_client import briq_client
from messaging.templates import get_message_templates, get_template_by_key_or_id
from messaging.message_builder import MessageBuilder, send_sms_with_logging

logger = logging.getLogger(__name__)

# Re-export for backwards compatibility
__all__ = [
    'briq_client',
    'get_message_templates',
    'get_template_by_key_or_id',
    'send_task_registration_sms',
    'send_debt_reminder_sms',
    'send_ready_for_pickup_sms',
    'send_picked_up_sms',
    'send_pickup_reminder_sms',
    'build_template_message',
]


def send_task_registration_sms(task, phone_number, user):
    """
    Send SMS notification to customer when a new task is registered.
    
    Args:
        task: Task instance that was just created
        phone_number: Customer's phone number
        user: User who created the task (for logging)
    
    Returns:
        dict: {success: bool, phone: str, error: str (if failed)}
    """
    builder = MessageBuilder(task)
    message = builder.build_registration_message()
    
    return send_sms_with_logging(
        task=task,
        phone_number=phone_number,
        message=message,
        user=user,
        activity_message=f"Task registration SMS sent to {phone_number}"
    )


def send_debt_reminder_sms(task, phone_number, user):
    """
    Send SMS reminder to customer about their outstanding debt.
    
    Args:
        task: Task instance with outstanding balance
        phone_number: Customer's phone number
        user: User who initiated the reminder (for logging)
    
    Returns:
        dict: {success: bool, phone: str, message: str, error: str (if failed)}
    """
    builder = MessageBuilder(task)
    message = builder.build_debt_reminder_message()
    
    if not message:
        return {
            'success': False,
            'error': 'Debt reminder template not found'
        }
    
    return send_sms_with_logging(
        task=task,
        phone_number=phone_number,
        message=message,
        user=user,
        activity_message=f"Debt reminder SMS sent to {phone_number}"
    )


def send_ready_for_pickup_sms(task, phone_number, user):
    """
    Send SMS notification to customer when their task is approved and ready for pickup.
    Uses the ready_for_pickup template which selects Solved/Not Solved variant
    based on workshop_status.
    
    Args:
        task: Task instance that was approved
        phone_number: Customer's phone number
        user: User who approved the task (for logging)
    
    Returns:
        dict: {success: bool, phone: str, message: str, error: str (if failed)}
    """
    builder = MessageBuilder(task)
    message = builder.build_ready_for_pickup_message()
    
    if not message:
        return {
            'success': False,
            'error': 'Failed to build ready for pickup message from template'
        }
    
    return send_sms_with_logging(
        task=task,
        phone_number=phone_number,
        message=message,
        user=user,
        activity_message=f"Ready for pickup SMS sent to {phone_number}"
    )


def send_picked_up_sms(task, phone_number, user):
    """
    Send SMS notification to customer when their task is picked up.
    Uses thank you template for normal pickups, debt reminder for debt pickups.
    
    Args:
        task: Task instance that was picked up
        phone_number: Customer's phone number
        user: User who processed the pickup (for logging)
    
    Returns:
        dict: {success: bool, phone: str, message: str, error: str (if failed)}
    """
    builder = MessageBuilder(task)
    message = builder.build_picked_up_message()
    
    activity_msg = "Debt reminder SMS sent" if task.is_debt else "Thank you SMS sent"
    
    return send_sms_with_logging(
        task=task,
        phone_number=phone_number,
        message=message,
        user=user,
        activity_message=f"{activity_msg} to {phone_number}"
    )


def build_template_message(task, template_key):
    """
    Build a message from a template key without sending it.
    Used for preview functionality.
    
    Args:
        task: Task instance
        template_key: 'ready_for_pickup', 'in_progress', or 'debt_reminder'
    
    Returns:
        str: The built message with all variables substituted
    """
    builder = MessageBuilder(task)
    return builder.build_template_message(template_key)


def send_pickup_reminder_sms(task, phone_number):
    """
    Send automated pickup reminder SMS to customer.
    Called by the scheduler - no user context needed.
    
    Args:
        task: Task instance that is ready for pickup
        phone_number: Customer's phone number
    
    Returns:
        dict: {success: bool, phone: str, message: str, error: str (if failed)}
    """
    builder = MessageBuilder(task)
    message = builder.build_pickup_reminder_message()
    
    if not message:
        return {
            'success': False,
            'error': 'Failed to build pickup reminder message'
        }
    
    return send_sms_with_logging(
        task=task,
        phone_number=phone_number,
        message=message,
        user=None,  # Automated - no user context
        activity_message=f"Automated pickup reminder SMS sent to {phone_number}"
    )
