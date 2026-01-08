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
    
    # Format date as DD/MM/YYYY
    date_str = timezone.now().strftime('%d/%m/%Y')
    
    # Build device name from brand and model
    device_parts = []
    if task.brand:
        device_parts.append(str(task.brand))
    if task.laptop_model:
        device_parts.append(str(task.laptop_model))
    device = ' '.join(device_parts) if device_parts else 'device'
    
    # Build the message (Swahili)
    message = (
        f"Habari {task.customer.name}, kifaa chako cha {device} kimepokelewa "
        f"na kusajiliwa rasmi tarehe {date_str} (Job No.: {task.title}). "
        f"Pindi utakapopokea meseji ya kukamilika au kutokamilika kwa huduma, "
        f"chukua kifaa ndani ya siku 7; baada ya hapo, gharama ya uhifadhi "
        f"TSH 3,000/siku itatozwa. Asante, A PLUS EXPRESS TECHNOLOGIES LTD."
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

