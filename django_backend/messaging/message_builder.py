"""
Message builder module for constructing and sending SMS messages.
Centralizes context extraction, variable substitution, and logging.
"""
import logging
from django.utils import timezone

from messaging.models import MessageLog
from messaging.sms_client import briq_client
from messaging.templates import (
    get_template_by_key_or_id,
    TEMPLATE_READY_SOLVED,
    TEMPLATE_READY_NOT_SOLVED,
    TEMPLATE_PICKED_UP_THANK_YOU,
    TEMPLATE_PICKED_UP_DEBT,
    TEMPLATE_PICKUP_REMINDER,
)

logger = logging.getLogger(__name__)


class MessageBuilder:
    """
    Centralizes context extraction and template variable substitution.
    Eliminates repeated logic across send_* functions.
    """
    
    def __init__(self, task):
        self.task = task
        self._settings = None
    
    @property
    def system_settings(self):
        """Lazy-load system settings."""
        if self._settings is None:
            from settings.models import SystemSettings
            self._settings = SystemSettings.get_settings()
        return self._settings
    
    @property
    def company_name(self) -> str:
        return self.system_settings.company_name or 'A PLUS EXPRESS TECHNOLOGIES LTD'
    
    @property
    def company_phones(self) -> list:
        return self.system_settings.company_phone_numbers or []
    
    def get_device_name(self) -> str:
        """Build device name from brand and model."""
        device_parts = []
        if self.task.brand:
            device_parts.append(str(self.task.brand))
        if self.task.laptop_model:
            device_parts.append(str(self.task.laptop_model))
        return ' '.join(device_parts) if device_parts else 'kifaa'
    
    def get_customer_name(self) -> str:
        """Get customer name with fallback."""
        return self.task.customer.name if self.task.customer else 'Mteja'
    
    def get_contact_info(self) -> str:
        """Build contact info string."""
        if self.company_phones:
            phones_str = ', '.join(self.company_phones)
            return f" Wasiliana nasi: {phones_str}."
        return ''
    
    def get_amount_str(self) -> str:
        """Format total cost amount."""
        amount = self.task.total_cost or 0
        return f"{amount:,.0f}/=" if amount else "0/="
    
    def get_outstanding_balance_str(self, include_suffix: bool = True) -> str:
        """Calculate and format outstanding balance."""
        total_cost = self.task.total_cost or 0
        paid_amount = self.task.paid_amount or 0
        outstanding = max(0, total_cost - paid_amount)
        if include_suffix:
            return f"{outstanding:,.0f}/=" if outstanding else "0/="
        return f"{outstanding:,.0f}"
    
    def get_hours_remaining(self) -> str:
        """Calculate hours remaining until 7-day deadline from when task was approved."""
        approved_at = self.task.approved_at
        if not approved_at:
            return "N/A"
        
        # 7-day deadline in hours
        deadline_hours = 7 * 24  # 168 hours
        
        # Hours elapsed since ready
        now = timezone.now()
        hours_elapsed = (now - approved_at).total_seconds() / 3600
        
        # Hours remaining (minimum 0)
        hours_remaining = max(0, deadline_hours - hours_elapsed)
        
        return str(int(hours_remaining))
    
    def get_description(self, uppercase: bool = False) -> str:
        """Get task description with optional uppercase."""
        desc = self.task.description or 'Hakuna'
        return desc.upper() if uppercase else desc
    
    def substitute_variables(self, template: str) -> str:
        """Substitute all template variables with actual values."""
        message = template.replace('{customer}', self.get_customer_name())
        message = message.replace('{device}', self.get_device_name())
        message = message.replace('{taskId}', self.task.title)
        message = message.replace('{amount}', self.get_amount_str())
        message = message.replace('{outstanding_balance}', self.get_outstanding_balance_str(include_suffix=False))
        message = message.replace('{DESCRIPTION}', self.get_description(uppercase=True))
        message = message.replace('{description}', self.get_description())
        message = message.replace('{contact_info}', self.get_contact_info())
        message = message.replace('{company_name}', self.company_name)
        message = message.replace('{status}', self.task.status or '')
        message = message.replace('{hours_remaining}', self.get_hours_remaining())
        return message
    
    @staticmethod
    def sanitize(message: str) -> str:
        """Remove newlines (API provider constraint) and strip whitespace."""
        return message.replace('\n', ' ').replace('\r', '').strip()
    
    def build_registration_message(self) -> str:
        """Build task registration SMS message."""
        date_str = timezone.now().strftime('%d/%m/%Y')
        
        # Build device notes section (in capital letters)
        device_notes_section = ''
        if self.task.device_notes:
            device_notes_section = f" {self.task.device_notes.upper()}."
        
        message = (
            f"Habari {self.get_customer_name()}, kifaa chako cha {self.get_device_name()} kimepokelewa "
            f"na kusajiliwa rasmi tarehe {date_str} (Job No.: {self.task.title})."
            f"{device_notes_section} "
            f"Pindi utakapopokea meseji ya kukamilika au kutokamilika kwa huduma, "
            f"chukua kifaa ndani ya siku 7; baada ya hapo, gharama ya uhifadhi "
            f"TSH 3,000/siku itatozwa.{self.get_contact_info()} Asante, {self.company_name}."
        )
        return self.sanitize(message)
    
    def build_ready_for_pickup_message(self) -> str:
        """Build ready for pickup SMS message based on workshop status."""
        if self.task.workshop_status == 'Solved':
            template = TEMPLATE_READY_SOLVED
        else:
            template = TEMPLATE_READY_NOT_SOLVED
        return self.sanitize(self.substitute_variables(template))
    
    def build_debt_reminder_message(self) -> str:
        """Build debt reminder SMS message."""
        template = get_template_by_key_or_id(key='debt_reminder')
        if not template:
            return None
        return self.sanitize(self.substitute_variables(template))
    
    def build_picked_up_message(self) -> str:
        """Build picked up SMS message based on is_debt flag."""
        if self.task.is_debt:
            template = TEMPLATE_PICKED_UP_DEBT
        else:
            template = TEMPLATE_PICKED_UP_THANK_YOU
        return self.sanitize(self.substitute_variables(template))
    
    def build_pickup_reminder_message(self) -> str:
        """Build pickup reminder SMS for tasks that are ready but not picked up."""
        return self.sanitize(self.substitute_variables(TEMPLATE_PICKUP_REMINDER))
    
    def build_template_message(self, template_key: str) -> str:
        """
        Build a message from a template key without sending it.
        Used for preview functionality.
        """
        if template_key == 'ready_for_pickup':
            return self.build_ready_for_pickup_message()
        elif template_key == 'in_progress':
            template = get_template_by_key_or_id(key='in_progress')
        elif template_key == 'debt_reminder':
            return self.build_debt_reminder_message()
        else:
            return None
        
        if not template:
            return None
        return self.sanitize(self.substitute_variables(template))


def send_sms_with_logging(task, phone_number: str, message: str, user, activity_message: str) -> dict:
    """
    Common pattern for sending SMS with logging.
    
    Args:
        task: Task instance
        phone_number: Recipient phone number
        message: SMS content to send
        user: User who initiated the send (for logging)
        activity_message: Message to log in TaskActivity
    
    Returns:
        dict: {success: bool, phone: str, message: str, error: str (if failed)}
    """
    from Eapp.models import TaskActivity
    
    # Create message log entry (pending)
    message_log = MessageLog.objects.create(
        task=task,
        recipient_phone=phone_number,
        message_content=message,
        status='pending',
        sent_by=user
    )
    
    # Send SMS via Briq
    result = briq_client.send_sms(
        content=message,
        recipients=[phone_number]
    )
    
    # Update message log with result
    if result.get('success'):
        message_log.status = 'sent'
        message_log.response_data = result.get('data')
        message_log.save()
        
        # Log activity on the task
        TaskActivity.objects.create(
            task=task,
            user=user,
            type='sms_sent',
            message=activity_message
        )
        
        logger.info(f"{activity_message} for task {task.title}")
        return {
            'success': True,
            'phone': phone_number,
            'message': message
        }
    else:
        message_log.status = 'failed'
        message_log.response_data = result
        message_log.save()
        
        logger.error(f"SMS failed for {phone_number}: {result.get('error')}")
        return {
            'success': False,
            'phone': phone_number,
            'error': result.get('error', 'Unknown error')
        }
