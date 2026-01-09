import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class BriqClient:
    """
    Client for Briq Karibu SMS API.
    Documentation: https://docs.briq.tz/
    """
    
    def __init__(self):
        self.api_key = getattr(settings, 'BRIQ_API_KEY', None)
        self.sender_id = getattr(settings, 'BRIQ_SENDER_ID', 'A-EXPRESS')
        self.base_url = 'https://karibu.briq.tz'
        self.headers = {
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json'
        }
    
    def send_sms(self, content: str, recipients: list, sender_id: str = None) -> dict:
        """
        Send an instant SMS message.
        
        Args:
            content: Message content (recommended max 160 chars for single SMS)
            recipients: List of phone numbers with country code (e.g., ['255788344348'])
            sender_id: Your brand name/identifier (optional, uses default if not provided)
        
        Returns:
            dict: API response containing success status and message data
        """
        if not self.api_key:
            logger.error("BRIQ_API_KEY not configured")
            return {
                'success': False,
                'error': 'BRIQ_API_KEY not configured in settings'
            }
        
        # Clean phone numbers - ensure correct format
        cleaned_recipients = []
        for phone in recipients:
            # Remove any spaces, dashes, or plus signs
            cleaned = phone.replace(' ', '').replace('-', '').replace('+', '')
            # Ensure it starts with country code (255 for Tanzania)
            if cleaned.startswith('0'):
                cleaned = '255' + cleaned[1:]
            cleaned_recipients.append(cleaned)
        
        payload = {
            'content': content,
            'recipients': cleaned_recipients,
            'sender_id': sender_id or self.sender_id
        }
        
        try:
            logger.info(f"Sending SMS to {cleaned_recipients}")
            response = requests.post(
                f'{self.base_url}/v1/message/send-instant',
                json=payload,
                headers=self.headers,
                timeout=30
            )
            
            response_data = response.json()
            
            if response.status_code == 200 and response_data.get('success'):
                logger.info(f"SMS sent successfully to {cleaned_recipients}")
                return {
                    'success': True,
                    'message': 'SMS sent successfully',
                    'data': response_data.get('data', {})
                }
            else:
                logger.error(f"SMS send failed: {response_data}")
                return {
                    'success': False,
                    'error': response_data.get('message', 'Unknown error'),
                    'data': response_data
                }
                
        except requests.exceptions.Timeout:
            logger.error("SMS send timed out")
            return {
                'success': False,
                'error': 'Request timed out'
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"SMS send failed with exception: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Unexpected error sending SMS: {str(e)}")
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}'
            }


# Singleton instance for convenience
briq_client = BriqClient()


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
    from django.utils import timezone
    from messaging.models import MessageLog
    from Eapp.models import TaskActivity
    from settings.models import SystemSettings
    
    # Get system settings for company info
    system_settings = SystemSettings.get_settings()
    company_name = system_settings.company_name or 'A PLUS EXPRESS TECHNOLOGIES LTD'
    company_phones = system_settings.company_phone_numbers or []
    
    # Format date as DD/MM/YYYY
    date_str = timezone.now().strftime('%d/%m/%Y')
    
    # Build device name from brand and model
    device_parts = []
    if task.brand:
        device_parts.append(str(task.brand))
    if task.laptop_model:
        device_parts.append(str(task.laptop_model))
    device = ' '.join(device_parts) if device_parts else 'device'
    
    # Build company phone numbers string
    contact_info = ''
    if company_phones:
        phones_str = ', '.join(company_phones)
        contact_info = f" Wasiliana nasi: {phones_str}."
    
    # Build device notes section (in capital letters)
    device_notes_section = ''
    if task.device_notes:
        device_notes_section = f" {task.device_notes.upper()}."
    
    # Build the message (Swahili)
    message = (
        f"Habari {task.customer.name}, kifaa chako cha {device} kimepokelewa "
        f"na kusajiliwa rasmi tarehe {date_str} (Job No.: {task.title})."
        f"{device_notes_section} "
        f"Pindi utakapopokea meseji ya kukamilika au kutokamilika kwa huduma, "
        f"chukua kifaa ndani ya siku 7; baada ya hapo, gharama ya uhifadhi "
        f"TSH 3,000/siku itatozwa.{contact_info} Asante, {company_name}."
    )
    
    # Sanitize message: remove newlines (API provider constraint)
    message = message.replace('\n', ' ').replace('\r', '').strip()
    
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
            message=f"Task registration SMS sent to {phone_number}"
        )
        
        logger.info(f"Task registration SMS sent to {phone_number} for task {task.title}")
        return {
            'success': True,
            'phone': phone_number
        }
    else:
        message_log.status = 'failed'
        message_log.response_data = result
        message_log.save()
        
        logger.error(f"Task registration SMS failed for {phone_number}: {result.get('error')}")
        return {
            'success': False,
            'phone': phone_number,
            'error': result.get('error', 'Unknown error')
        }


# Default message templates (Hardcoded)
DEFAULT_MESSAGE_TEMPLATES = [
    {
        'key': 'in_progress',
        'name': 'Repair in Progress',
        'content': (
            "Habari {customer}, kifaa chako cha {device} kilisajiliwa kwenye mfumo wetu "
            "(Job No.: {taskId}). Baada ya uchunguzi, tatizo ni {DESCRIPTION}, "
            "na mafundi wanaendelea na matengenezo. Tunaomba uwe na subira, "
            "na tutakutaarifu pindi kazi itakapokamilika.{contact_info} – {company_name}."
        ),
        'is_default': True
    },
    {
        'key': 'ready_for_pickup',
        'name': 'Ready for Pickup',
        'content': (
            "Habari {customer}, kifaa chako {device} (Job No.: {taskId}) {status}. "
            "Tatizo: {DESCRIPTION}. Gharama: TSH {amount}. "
            "Tafadhali chukua ndani ya siku 7.{contact_info} – {company_name}."
        ),
        'is_default': True
    },
    {
        'key': 'debt_reminder',
        'name': 'Remind Debt',
        'content': (
            "Habari {customer}, tunakumbusha kuwa unadaiwa deni la TSH {outstanding_balance} "
            "kwa kazi ya {device} (Job No.: {taskId}). Tafadhali lipa mapema iwezekanavyo "
            "ili kuepuka usumbufu.{contact_info} Asante kwa kushirikiana na {company_name}."
        ),
        'is_default': True
    }
]

# Specific templates for dynamic resolution
TEMPLATE_READY_SOLVED = (
    "Habari {customer}, kifaa chako {device} imeyosajiliwa kwenye mfumo wetu (Job No.: {taskId}). "
    "Kompyuta yako imefanyiwa kazi, IMEPONA na ipo tayari kuchukuliwa, na gharama yake ni TSH {amount}. "
    "Unatakiwa kuichukua ndani ya siku 7 kuanzia leo; baada ya hapo, utatozwa gharama za uhifadhi TSH 3,000/siku. "
    "Asante kwa kushirikiana,{contact_info} – {company_name}."
)

TEMPLATE_READY_NOT_SOLVED = (
    "Habari {customer}, kifaa chako {device} imeyosajiliwa kwenye mfumo wetu (Job No.: {taskId}). "
    "Kompyuta yako imefanyiwa kazi, HAIJAPONA na ipo tayari kuchukuliwa. "
    "Unatakiwa kuichukua ndani ya siku 7 kuanzia leo; baada ya hapo, utatozwa gharama za uhifadhi TSH 3,000/siku. "
    "Asante kwa kushirikiana,{contact_info} – {company_name}."
)


def get_message_templates():
    """
    Get all message templates (defaults + database).
    """
    from messaging.models import MessageTemplate
    
    # Start with defaults
    templates = [t.copy() for t in DEFAULT_MESSAGE_TEMPLATES]
    
    # Add database templates
    db_templates = MessageTemplate.objects.filter(is_active=True)
    for t in db_templates:
        templates.append({
            'id': t.id,
            'name': t.name,
            'content': t.content,
            'is_default': False
        })
        
    return templates


def get_template_by_key_or_id(key=None, template_id=None):
    """
    Get a template content by either its string key (default) or DB ID.
    """
    from messaging.models import MessageTemplate
    
    if key:
        for t in DEFAULT_MESSAGE_TEMPLATES:
            if t['key'] == key:
                return t['content']
    
    if template_id:
        try:
            return MessageTemplate.objects.get(id=template_id).content
        except MessageTemplate.DoesNotExist:
            pass
            
    return None


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
    from settings.models import SystemSettings
    
    # Get system settings for company info
    system_settings = SystemSettings.get_settings()
    company_name = system_settings.company_name or 'A PLUS EXPRESS TECHNOLOGIES LTD'
    company_phones = system_settings.company_phone_numbers or []
    
    # Build contact info string
    contact_info = ''
    if company_phones:
        phones_str = ', '.join(company_phones)
        contact_info = f" Wasiliana nasi: {phones_str}."
    
    # Build device name
    device_parts = []
    if task.brand:
        device_parts.append(str(task.brand))
    if task.laptop_model:
        device_parts.append(str(task.laptop_model))
    device = ' '.join(device_parts) if device_parts else 'kifaa'
    
    # Get customer name
    customer_name = task.customer.name if task.customer else 'Mteja'
    
    # Select the appropriate template
    if template_key == 'ready_for_pickup':
        # Choose template based on workshop status
        if task.workshop_status == 'Solved':
            template = TEMPLATE_READY_SOLVED
        else:
            template = TEMPLATE_READY_NOT_SOLVED
    elif template_key == 'in_progress':
        template = get_template_by_key_or_id(key='in_progress')
    elif template_key == 'debt_reminder':
        template = get_template_by_key_or_id(key='debt_reminder')
    else:
        return None
    
    if not template:
        return None
    
    # Format amounts
    amount = task.total_cost or 0
    amount_str = f"{amount:,.0f}/=" if amount else "0/="
    
    # Calculate outstanding balance (total_cost - paid_amount)
    total_cost = task.total_cost or 0
    paid_amount = task.paid_amount or 0
    outstanding = max(0, total_cost - paid_amount)
    outstanding_str = f"{outstanding:,.0f}/=" if outstanding else "0/="
    
    # Get description
    description = (task.description or 'Hakuna').upper()
    
    # Substitute all variables
    message = template.replace('{customer}', customer_name)
    message = message.replace('{device}', device)
    message = message.replace('{taskId}', task.title)
    message = message.replace('{amount}', amount_str)
    message = message.replace('{outstanding_balance}', outstanding_str)
    message = message.replace('{DESCRIPTION}', description)
    message = message.replace('{description}', task.description or 'Hakuna')
    message = message.replace('{contact_info}', contact_info)
    message = message.replace('{company_name}', company_name)
    message = message.replace('{status}', task.status or '')
    
    # Sanitize: remove newlines
    message = message.replace('\n', ' ').replace('\r', '').strip()
    
    return message

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
    from messaging.models import MessageLog
    from Eapp.models import TaskActivity
    from settings.models import SystemSettings
    
    # Get system settings for company info
    system_settings = SystemSettings.get_settings()
    company_name = system_settings.company_name or 'A PLUS EXPRESS TECHNOLOGIES LTD'
    company_phones = system_settings.company_phone_numbers or []
    
    # Get the debt reminder template
    template = get_template_by_key_or_id(key='debt_reminder')
    if not template:
        return {
            'success': False,
            'error': 'Debt reminder template not found'
        }
    
    # Build device name from brand and model
    device_parts = []
    if task.brand:
        device_parts.append(str(task.brand))
    if task.laptop_model:
        device_parts.append(str(task.laptop_model))
    device = ' '.join(device_parts) if device_parts else 'kifaa'
    
    # Format outstanding balance (computed from total_cost - paid_amount)
    total_cost = task.total_cost or 0
    paid_amount = task.paid_amount or 0
    outstanding = max(0, total_cost - paid_amount)
    outstanding_str = f"{outstanding:,.0f}/=" if outstanding else "0/="
    
    # Build contact info
    contact_info = ''
    if company_phones:
        phones_str = ', '.join(company_phones)
        contact_info = f" Wasiliana nasi: {phones_str}."
    
    # Build the message
    message = template.replace('{customer}', task.customer.name or 'Mteja')
    message = message.replace('{outstanding_balance}', outstanding_str)
    message = message.replace('{device}', device)
    message = message.replace('{taskId}', task.title)
    message = message.replace('{contact_info}', contact_info)
    message = message.replace('{company_name}', company_name)
    
    # Sanitize message: remove newlines (API provider constraint)
    message = message.replace('\n', ' ').replace('\r', '').strip()
    
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
            message=f"Debt reminder SMS sent to {phone_number}"
        )
        
        logger.info(f"Debt reminder SMS sent to {phone_number} for task {task.title}")
        return {
            'success': True,
            'phone': phone_number,
            'message': message
        }
    else:
        message_log.status = 'failed'
        message_log.response_data = result
        message_log.save()
        
        logger.error(f"Debt reminder SMS failed for {phone_number}: {result.get('error')}")
        return {
            'success': False,
            'phone': phone_number,
            'error': result.get('error', 'Unknown error')
        }

