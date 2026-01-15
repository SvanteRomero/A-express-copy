from notifications.utils import broadcast_toast_notification
import logging

logger = logging.getLogger(__name__)

class TaskNotificationHandler:
    """
    Service for handling task-related notifications (SMS and WebSocket toasts).
    """

    @staticmethod
    def notify_task_created(task, customer):
        """
        Send SMS and broadcast toast when a task is created.
        Returns SMS details.
        """
        sms_result = {'success': False, 'phone': None}
        
        # 1. Send SMS (if enabled)
        try:
            from settings.models import SystemSettings
            from messaging.services import send_task_registration_sms
            from common.encryption import decrypt_value
            
            system_settings = SystemSettings.get_settings()
            if system_settings.auto_sms_on_task_creation and customer:
                customer.refresh_from_db()
                primary_phone = customer.phone_numbers.first()
                if primary_phone:
                    phone_number = decrypt_value(primary_phone.phone_number)
                    result = send_task_registration_sms(task, phone_number, task.created_by)
                    sms_result = {'success': result.get('success', False), 'phone': result.get('phone')}
        except Exception as e:
            logger.error(f"Error sending task registration SMS: {e}")

        # 2. Broadcast Toast
        broadcast_toast_notification(
            roles=['manager', 'front_desk'],
            toast_type='task_created',
            data={
                'task_title': task.title,
                'customer_name': customer.name if customer else 'Unknown',
            }
        )
        
        return sms_result

    @staticmethod
    def notify_ready_for_pickup(task, user):
        """
        Send SMS and broadcast toast when task is ready for pickup.
        Returns SMS details.
        """
        sms_result = {'success': False, 'phone': None}
        
        # 1. Send SMS
        try:
            from messaging.services import send_ready_for_pickup_sms
            from common.encryption import decrypt_value
            
            task.refresh_from_db()
            customer = task.customer
            if customer:
                customer.refresh_from_db()
                primary_phone = customer.phone_numbers.first()
                if primary_phone:
                    phone_number = decrypt_value(primary_phone.phone_number)
                    result = send_ready_for_pickup_sms(task, phone_number, user)
                    sms_result = {'success': result.get('success', False), 'phone': result.get('phone')}
        except Exception as e:
            logger.error(f"Error sending ready for pickup SMS: {e}")

        # 2. Broadcast Toast
        broadcast_toast_notification(
            roles=['manager', 'front_desk'],
            toast_type='task_approved',
            data={
                'task_title': task.title,
                'sms_sent': sms_result['success'],
            }
        )
        
        return sms_result

    @staticmethod
    def notify_picked_up(task, user):
        """
        Send SMS and broadcast toast when task is picked up.
        Returns SMS details.
        """
        sms_result = {'success': False, 'phone': None}
        
        # 1. Send SMS
        try:
            from messaging.services import send_picked_up_sms
            from common.encryption import decrypt_value
            
            task.refresh_from_db()
            customer = task.customer
            if customer:
                customer.refresh_from_db()
                primary_phone = customer.phone_numbers.first()
                if primary_phone:
                    phone_number = decrypt_value(primary_phone.phone_number)
                    result = send_picked_up_sms(task, phone_number, user)
                    sms_result = {'success': result.get('success', False), 'phone': result.get('phone')}
        except Exception as e:
            logger.error(f"Error sending picked up SMS: {e}")

        # 2. Broadcast Toast
        broadcast_toast_notification(
            roles=['manager', 'front_desk'],
            toast_type='task_picked_up',
            data={
                'task_title': task.title,
            }
        )
        
        return sms_result

    @staticmethod
    def notify_task_updated(task, data):
        """
        Broadcast generic task update toast if significant fields changed.
        """
        # Only broadcast if not already covered by status-specific toasts
        if data.get('status') in ['Ready for Pickup', 'Picked Up']:
            return

        fields_changed = []
        if 'assigned_to' in data:
            fields_changed.append('Technician')
        if 'status' in data:
            fields_changed.append('Status')
        if 'current_location' in data:
            fields_changed.append('Location')
        if 'urgency' in data:
            fields_changed.append('Urgency')
        
        if fields_changed:
            broadcast_toast_notification(
                roles=['manager', 'front_desk'],
                toast_type='task_updated',
                data={
                    'task_title': task.title,
                    'fields_changed': fields_changed,
                }
            )

    @staticmethod
    def notify_payment_added(task, payment):
        """
        Broadcast toast when payment is added.
        """
        broadcast_toast_notification(
            roles=['manager', 'accountant', 'front_desk'],
            toast_type='payment_added',
            data={
                'task_title': task.title,
                'amount': str(payment.amount),
            }
        )
