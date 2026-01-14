"""
Scheduled jobs for automated SMS messaging.
Contains the pickup reminder job that runs periodically.
"""
import logging
from django.utils import timezone
from django.db.models import Q

logger = logging.getLogger(__name__)


def send_pickup_reminders():
    """
    Scheduled job to send pickup reminder SMS for tasks that are ready for pickup.
    
    Logic:
    1. Check if auto_pickup_reminders_enabled is True
    2. Find tasks with status 'Ready for Pickup'
    3. For each task, check if enough hours have passed since:
       - The last reminder SMS was sent, OR
       - The task was approved (if no reminder sent yet)
    4. Send reminder SMS and log it
    """
    from settings.models import SystemSettings
    from Eapp.models import Task
    from messaging.models import MessageLog
    from messaging.services import send_pickup_reminder_sms
    
    # Get settings
    settings = SystemSettings.get_settings()
    
    if not settings.auto_pickup_reminders_enabled:
        logger.info("Pickup reminders disabled - skipping job")
        return
    
    reminder_hours = settings.pickup_reminder_hours
    now = timezone.now()
    
    # Find tasks ready for pickup
    ready_tasks = Task.objects.filter(
        status=Task.Status.READY_FOR_PICKUP
    ).select_related('customer')
    
    logger.info(f"Found {ready_tasks.count()} tasks ready for pickup")
    
    reminders_sent = 0
    failures = []  # Track failures for notification
    
    for task in ready_tasks:
        try:
            # Check when was the last reminder sent for this task
            last_reminder = MessageLog.objects.filter(
                task=task,
                status='sent',
                message_content__icontains='tunakukumbusha'  # Reminder keyword
            ).order_by('-sent_at').first()
            
            # Determine when to compare against
            if last_reminder:
                last_contact_time = last_reminder.sent_at
            else:
                # No reminder sent yet - use approved time
                last_contact_time = task.approved_at
            
            if not last_contact_time:
                logger.warning(f"Task {task.title}: No approved_at time, skipping")
                continue
            
            # Calculate hours since last contact
            hours_since_contact = (now - last_contact_time).total_seconds() / 3600
            
            if hours_since_contact >= reminder_hours:
                # Get customer phone
                if not task.customer or not task.customer.phone_numbers.exists():
                    logger.warning(f"Task {task.title}: No phone number, skipping")
                    continue
                
                # Use primary phone number (decrypt since stored encrypted in PostgreSQL)
                from common.encryption import decrypt_value
                primary_phone = task.customer.phone_numbers.first()
                phone_number = decrypt_value(primary_phone.phone_number)
                
                # Send reminder
                result = send_pickup_reminder_sms(task, phone_number)
                
                if result.get('success'):
                    reminders_sent += 1
                    logger.info(f"Sent reminder for task {task.title} to {phone_number}")
                else:
                    failures.append({
                        'task_id': task.title,
                        'task_title': task.title,
                        'error': result.get('error', 'Unknown error')
                    })
                    logger.error(f"Failed to send reminder for task {task.title}: {result.get('error')}")
            else:
                logger.debug(
                    f"Task {task.title}: Only {hours_since_contact:.1f}h since last contact, "
                    f"need {reminder_hours}h"
                )
                
        except Exception as e:
            logger.exception(f"Error processing task {task.title}: {e}")
    
    logger.info(f"Pickup reminder job completed: {reminders_sent} reminders sent")
    
    # Create notification for frontend polling
    from messaging.models import SchedulerNotification
    SchedulerNotification.objects.create(
        job_type='pickup_reminder',
        tasks_found=ready_tasks.count(),
        messages_sent=reminders_sent,
        messages_failed=len(failures),
        failure_details=failures,
    )
    
    # Cleanup: Delete notifications older than 7 days
    cleanup_cutoff = now - timezone.timedelta(days=7)
    deleted_count, _ = SchedulerNotification.objects.filter(created_at__lt=cleanup_cutoff).delete()
    if deleted_count:
        logger.info(f"Cleaned up {deleted_count} old scheduler notifications")


def send_debt_reminders():
    """
    Scheduled job to send debt reminder SMS for tasks with outstanding debts.
    
    Logic:
    1. Check if auto_debt_reminders_enabled is True
    2. Find tasks with is_debt=True and status='Picked Up'
    3. Skip tasks older than debt_reminder_max_days since pickup
    4. Send reminder if debt_reminder_hours have passed since last debt reminder
    """
    from settings.models import SystemSettings
    from Eapp.models import Task
    from messaging.models import MessageLog
    from messaging.services import send_debt_reminder_sms
    
    # Get settings
    settings = SystemSettings.get_settings()
    
    if not settings.auto_debt_reminders_enabled:
        logger.info("Debt reminders disabled - skipping job")
        return
    
    reminder_hours = settings.debt_reminder_hours
    max_days = settings.debt_reminder_max_days
    now = timezone.now()
    
    # Calculate the cutoff date (don't send reminders for very old debts)
    cutoff_date = now - timezone.timedelta(days=max_days)
    
    # Find tasks with debt that were picked up within the max_days window
    debt_tasks = Task.objects.filter(
        is_debt=True,
        status=Task.Status.PICKED_UP,
        updated_at__gte=cutoff_date  # Only tasks updated within max_days
    ).select_related('customer')
    
    logger.info(f"Found {debt_tasks.count()} debt tasks within {max_days} day window")
    
    reminders_sent = 0
    failures = []  # Track failures for notification
    
    for task in debt_tasks:
        try:
            # Check when was the last debt reminder sent for this task
            last_reminder = MessageLog.objects.filter(
                task=task,
                status='sent',
                message_content__icontains='deni'  # Debt reminder keyword in Swahili
            ).order_by('-sent_at').first()
            
            # Determine when to compare against
            if last_reminder:
                last_contact_time = last_reminder.sent_at
            else:
                # No reminder sent yet - use when task was last updated (likely when marked as debt)
                last_contact_time = task.updated_at
            
            if not last_contact_time:
                logger.warning(f"Task {task.title}: No timestamp available, skipping")
                continue
            
            # Calculate hours since last contact
            hours_since_contact = (now - last_contact_time).total_seconds() / 3600
            
            if hours_since_contact >= reminder_hours:
                # Get customer phone
                if not task.customer or not task.customer.phone_numbers.exists():
                    logger.warning(f"Task {task.title}: No phone number, skipping")
                    continue
                
                # Use primary phone number (decrypt since stored encrypted in PostgreSQL)
                from common.encryption import decrypt_value
                primary_phone = task.customer.phone_numbers.first()
                phone_number = decrypt_value(primary_phone.phone_number)
                
                # Send reminder using existing debt reminder service
                result = send_debt_reminder_sms(task, phone_number, user=None)
                
                if result.get('success'):
                    reminders_sent += 1
                    logger.info(f"Sent debt reminder for task {task.title} to {phone_number}")
                else:
                    failures.append({
                        'task_id': task.title,
                        'task_title': task.title,
                        'error': result.get('error', 'Unknown error')
                    })
                    logger.error(f"Failed to send debt reminder for task {task.title}: {result.get('error')}")
            else:
                logger.debug(
                    f"Task {task.title}: Only {hours_since_contact:.1f}h since last contact, "
                    f"need {reminder_hours}h"
                )
                
        except Exception as e:
            logger.exception(f"Error processing debt task {task.title}: {e}")
    
    logger.info(f"Debt reminder job completed: {reminders_sent} reminders sent")
    
    # Create notification for frontend polling
    from messaging.models import SchedulerNotification
    SchedulerNotification.objects.create(
        job_type='debt_reminder',
        tasks_found=debt_tasks.count(),
        messages_sent=reminders_sent,
        messages_failed=len(failures),
        failure_details=failures,
    )
    
    # Cleanup: Delete notifications older than 7 days
    cleanup_cutoff = now - timezone.timedelta(days=7)
    deleted_count, _ = SchedulerNotification.objects.filter(created_at__lt=cleanup_cutoff).delete()
    if deleted_count:
        logger.info(f"Cleaned up {deleted_count} old scheduler notifications")
