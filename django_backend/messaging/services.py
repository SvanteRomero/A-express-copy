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
