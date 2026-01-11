from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from Eapp.models import Task, TaskActivity
from .models import MessageLog
from .services import briq_client, send_debt_reminder_sms, build_template_message
from .serializers import SendSMSSerializer




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_customer_sms(request, task_id):
    """
    Send an SMS to a customer for a specific task.
    
    POST /api/messaging/tasks/{task_id}/send-sms/
    Body: { "phone_number": "255...", "message": "..." }
    """
    # Get the task
    task = get_object_or_404(Task, id=task_id)
    
    # Validate request data
    serializer = SendSMSSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': 'Validation failed',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    phone_number = serializer.validated_data['phone_number']
    message = serializer.validated_data['message']
    
    # Create message log entry (pending)
    message_log = MessageLog.objects.create(
        task=task,
        recipient_phone=phone_number,
        message_content=message,
        status='pending',
        sent_by=request.user
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
            user=request.user,
            type='sms_sent',
            message=f"SMS sent to {phone_number}"
        )
        
        return Response({
            'success': True,
            'message': 'SMS sent successfully',
            'data': {
                'recipient': phone_number,
                'message_log_id': message_log.id
            }
        }, status=status.HTTP_200_OK)
    else:
        message_log.status = 'failed'
        message_log.response_data = result
        message_log.save()
        
        return Response({
            'success': False,
            'error': result.get('error', 'Failed to send SMS'),
            'details': result
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_debt_reminder(request, task_id):
    """
    Send a debt reminder SMS to the customer for a specific task.
    Uses the backend debt_reminder template with server-side variable substitution.
    
    POST /api/messaging/tasks/{task_id}/send-debt-reminder/
    Body (optional): { "phone_number": "255..." }
    """
    # Get the task
    task = get_object_or_404(Task, id=task_id)
    
    # Verify the task has an outstanding balance (is a debt)
    if not task.outstanding_balance or task.outstanding_balance <= 0:
        return Response({
            'success': False,
            'error': 'This task has no outstanding balance'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get phone number from request or use customer's primary phone
    phone_number = request.data.get('phone_number')
    if not phone_number:
        # Try to get the customer's primary phone
        customer = task.customer
        if customer and customer.phone_numbers.exists():
            from common.encryption import decrypt_value
            encrypted_phone = customer.phone_numbers.first().phone_number
            phone_number = decrypt_value(encrypted_phone)
    
    if not phone_number:
        return Response({
            'success': False,
            'error': 'No phone number provided and customer has no phone on file'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Send the debt reminder using the service function
    result = send_debt_reminder_sms(task, phone_number, request.user)
    
    if result.get('success'):
        return Response({
            'success': True,
            'message': 'Debt reminder sent successfully',
            'data': {
                'recipient': result.get('phone'),
                'sms_content': result.get('message')
            }
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'success': False,
            'error': result.get('error', 'Failed to send debt reminder')
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preview_template_message(request, task_id):
    """
    Preview a message template without sending.
    Returns the fully built message that will be sent.
    
    POST /api/messaging/tasks/{task_id}/preview-message/
    Body: { "template_key": "ready_for_pickup" | "in_progress" | "debt_reminder" }
    """
    # Get the task
    task = get_object_or_404(Task, id=task_id)
    
    # Get template key from request
    template_key = request.data.get('template_key')
    if not template_key:
        return Response({
            'success': False,
            'error': 'template_key is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    valid_keys = ['ready_for_pickup', 'in_progress', 'debt_reminder']
    if template_key not in valid_keys:
        return Response({
            'success': False,
            'error': f'Invalid template_key. Must be one of: {", ".join(valid_keys)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Build the message preview
    message = build_template_message(task, template_key)
    
    if not message:
        return Response({
            'success': False,
            'error': 'Failed to build message from template'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Get customer's primary phone for preview
    phone = None
    if task.customer and task.customer.phone_numbers.exists():
        from common.encryption import decrypt_value
        encrypted_phone = task.customer.phone_numbers.first().phone_number
        phone = decrypt_value(encrypted_phone)
    
    return Response({
        'success': True,
        'message': message,
        'phone': phone,
        'customer_name': task.customer.name if task.customer else None,
        'template_key': template_key
    }, status=status.HTTP_200_OK)


# --- New Bulk Messaging Views ---

from rest_framework import viewsets
from .models import MessageTemplate
from .serializers import MessageTemplateSerializer, BulkSendSMSSerializer, MessageLogSerializer

class MessageTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD for SMS templates.
    """
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        """
        Return list of all templates (hardcoded defaults + database).
        """
        from .services import get_message_templates
        templates = get_message_templates()
        return Response(templates)


from Eapp.pagination import StandardResultsSetPagination
from django_filters import rest_framework as filters
from django.db.models import Q

class MessageLogFilter(filters.FilterSet):
    search = filters.CharFilter(method='search_filter')
    
    class Meta:
        model = MessageLog
        fields = ['status']
    
    def search_filter(self, queryset, name, value):
        return queryset.filter(
            Q(recipient_phone__icontains=value) |
            Q(message_content__icontains=value) |
            Q(task__customer__name__icontains=value)
        )

class MessageLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only view for message history logs with pagination and search.
    """
    queryset = MessageLog.objects.all().select_related('task', 'task__customer', 'sent_by').order_by('-sent_at')
    serializer_class = MessageLogSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filterset_class = MessageLogFilter


from common.encryption import decrypt_value

# ... existing imports ...

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_send_sms(request):
    """
    Send SMS to multiple tasks/customers.
    """
    serializer = BulkSendSMSSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    recipients_data = serializer.validated_data['recipients'] # List of {task_id, phone}
    task_ids = [int(r['task_id']) for r in recipients_data]
    
    manual_message = serializer.validated_data.get('message')
    template_id = serializer.validated_data.get('template_id')
    template_key = serializer.validated_data.get('template_key')
    
    # Determine message content
    message_content = manual_message
    
    if not message_content:
        from .services import get_template_by_key_or_id
        content = get_template_by_key_or_id(key=template_key, template_id=template_id)
        if content:
            message_content = content
        else:
            return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)
            
    # Sanitize message: remove newlines (API provider constraint)
    message_content = message_content.replace('\n', ' ').replace('\r', '').strip()
    
    # Get company info for placeholders
    from settings.models import SystemSettings
    system_settings = SystemSettings.get_settings()
    company_name = system_settings.company_name or 'A PLUS EXPRESS TECHNOLOGIES LTD'
    company_phones = system_settings.company_phone_numbers or []
    
    # Build contact info string
    contact_info_str = ''
    if company_phones:
        phones_str = ', '.join(company_phones)
        contact_info_str = f" Wasiliana nasi: {phones_str}."
    
    # Fetch tasks
    tasks = Task.objects.filter(id__in=task_ids).select_related('customer')
    task_map = {task.id: task for task in tasks}
    
    success_count = 0
    failed_count = 0
    errors = []
    
    for recipient in recipients_data:
        task_id = int(recipient['task_id'])
        phone_number = recipient.get('phone')
        
        task = task_map.get(task_id)
        if not task:
            failed_count += 1
            errors.append(f"Task {task_id} not found")
            continue

        # Resolve variables
        # Dynamic template resolution per task
        final_message = message_content
        
        if template_key == 'ready_for_pickup':
            from messaging.services import TEMPLATE_READY_SOLVED, TEMPLATE_READY_NOT_SOLVED
            
            # Use specific template based on workshop_status
            if task.workshop_status == 'Solved':
                final_message = TEMPLATE_READY_SOLVED
            elif task.workshop_status == 'Not Solved':
                final_message = TEMPLATE_READY_NOT_SOLVED
            # Else fallback to default 'ready_for_pickup' content
        
        # Replace variables
        final_message = final_message.replace('{customer}', task.customer.name)
        final_message = final_message.replace('{device}', f"{task.brand or ''} {task.laptop_model or ''}".strip() or "Device")
        final_message = final_message.replace('{taskId}', task.title)
        
        # Handle description
        description = task.description or "Unknown Issue"
        final_message = final_message.replace('{DESCRIPTION}', description.upper())
        final_message = final_message.replace('{description}', description) # Support lowercase placeholder key too
        
        final_message = final_message.replace('{notes}', task.device_notes or '')
        
        # Swahili status translation
        status_map = {
            'Pending': 'Imepokelewa',
            'In Progress': 'Inashughulikiwa',
            'Ready for Pickup': 'Ipo Tayari',
            'Picked Up': 'Imeshachukuliwa',
            'Completed': 'Imekamilika',
        }
        swahili_status = status_map.get(task.status, task.status)
        
        final_message = final_message.replace('{status}', swahili_status)
        
        # Handle amount properly
        amount_val = str(task.total_cost)
        if hasattr(task, 'total_cost') and task.total_cost:
            amount_val = "{:,.0f}".format(task.total_cost)
        final_message = final_message.replace('{amount}', amount_val)
        
        # Handle outstanding balance for debt reminder
        outstanding = task.total_cost - task.paid_amount
        outstanding_str = "{:,.0f}".format(outstanding) if outstanding > 0 else "0"
        final_message = final_message.replace('{outstanding_balance}', outstanding_str)
        
        final_message = final_message.replace('{company_name}', company_name)
        final_message = final_message.replace('{contact_info}', contact_info_str)

        # Use specific phone number if provided, otherwise default fallback (shouldn't happen with new UI)
        if not phone_number:
             # Fallback logic if needed, or error
             failed_count += 1
             errors.append(f"Task {task_id}: No phone number provided")
             continue

        if phone_number:
            # Create log
            log = MessageLog.objects.create(
                task=task,
                recipient_phone=phone_number,
                message_content=final_message,
                status='pending',
                sent_by=request.user
            )
            
            # Send
            result = briq_client.send_sms(content=final_message, recipients=[phone_number])
            
            if result.get('success'):
                log.status = 'sent'
                log.response_data = result.get('data')
                success_count += 1
                
                # Activity log
                TaskActivity.objects.create(
                    task=task,
                    user=request.user,
                    type='sms_sent',
                    message=f"Bulk SMS sent"
                )
            else:
                log.status = 'failed'
                log.response_data = result
                failed_count += 1
                errors.append(f"Task {task.id}: {result.get('error')}")
            
            log.save()
        else:
             failed_count += 1
             errors.append(f"Task {task.id}: No phone number")

    return Response({
        'success': True,
        'summary': {
            'total_attempted': len(tasks),
            'sent': success_count,
            'failed': failed_count,
        },
        'errors': errors
    })
