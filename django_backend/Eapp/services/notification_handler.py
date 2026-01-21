from notifications.utils import broadcast_toast_notification, send_toast_to_user
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
        
        # 3. Notify assigned technician (if any)
        if task.assigned_to:
            TaskNotificationHandler.notify_task_assigned(task, task.assigned_to, task.created_by)

        return sms_result

    @staticmethod
    def notify_task_assigned(task, assignee, assigner):
        """
        Send a personal toast to the technician who was assigned the task.
        """
        if not assignee:
            return

        assigner_name = assigner.get_full_name() if hasattr(assigner, 'get_full_name') else str(assigner)
        send_toast_to_user(
            user=assignee,
            toast_type='task_assigned',
            data={
                'task_title': task.title,
                'assigner_name': assigner_name,
            }
        )

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
                'sms_phone': sms_result.get('phone'),
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
                'is_debt': task.is_debt,
                'sms_sent': sms_result['success'],
                'sms_phone': sms_result.get('phone'),
            }
        )
        
        return sms_result

    @staticmethod
    def notify_task_completed(task, technician):
        """
        Broadcast toast when technician marks task as completed.
        """
        technician_name = technician.get_full_name() if hasattr(technician, 'get_full_name') else str(technician)
        broadcast_toast_notification(
            roles=['manager', 'front_desk'],
            toast_type='task_completed',
            data={
                'task_title': task.title,
                'technician_name': technician_name,
            }
        )

    @staticmethod
    def notify_sent_to_workshop(task, sender):
        """
        Broadcast toast to workshop technicians when task is sent to workshop.
        """
        sender_name = sender.get_full_name() if hasattr(sender, 'get_full_name') else str(sender)
        broadcast_toast_notification(
            roles=['technician'],  # Workshop technicians are in the technician role group
            toast_type='task_sent_to_workshop',
            data={
                'task_title': task.title,
                'sender_name': sender_name,
            }
        )

    @staticmethod
    def notify_workshop_status_changed(task, workshop_status, user):
        """
        Broadcast toast to original technician when workshop marks task as Solved/Not Solved.
        """
        tech_name = user.get_full_name() if hasattr(user, 'get_full_name') else str(user)
        toast_type = 'workshop_task_solved' if workshop_status == 'Solved' else 'workshop_task_not_solved'
        broadcast_toast_notification(
            roles=['technician'],  # Notify the original technician
            toast_type=toast_type,
            data={
                'task_title': task.title,
                'workshop_technician_name': tech_name,
            }
        )

    @staticmethod
    def notify_task_updated(task, data, user=None):
        """
        Broadcast generic task update toast and notify new assignee.
        
        Args:
            task: Updated task instance
            data: Update data dict
            user: User performing the update (optional, needed for assignment notification)
        """
        # Only broadcast if not already covered by status-specific toasts
        if data.get('status') in ['Ready for Pickup', 'Picked Up', 'Completed']:
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

        # Notify new technician if assignment changed
        if 'assigned_to' in data and task.assigned_to and user:
            TaskNotificationHandler.notify_task_assigned(task, task.assigned_to, user)

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

    @staticmethod
    def broadcast_task_update(task, updated_fields: list = None):
        """
        Broadcast task update for live cache invalidation across all clients.
        This enables real-time updates without page refresh.
        """
        from notifications.utils import broadcast_task_status_update
        broadcast_task_status_update(
            task_id=task.title,
            new_status=task.status,
            updated_fields=updated_fields
        )
