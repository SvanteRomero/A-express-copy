from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from Eapp.models import Task, TaskActivity
from .models import MessageLog
from .services import briq_client
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
    
    # Determine message content
    message_content = manual_message
    if not message_content and template_id:
        try:
            template = MessageTemplate.objects.get(id=template_id)
            message_content = template.content
        except MessageTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)
            
    # Sanitize message: remove newlines (API provider constraint)
    message_content = message_content.replace('\n', ' ').replace('\r', '').strip()
    
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
        final_message = message_content
        
        if '{' in final_message:
            customer_name = task.customer.name
            final_message = final_message.replace('{customer}', customer_name)
            final_message = final_message.replace('{device}', f"{task.brand or ''} {task.laptop_model or ''}".strip())
            final_message = final_message.replace('{taskId}', str(task.title))
            final_message = final_message.replace('{description}', task.description or '')
            final_message = final_message.replace('{notes}', f"||| Maelezo: {task.device_notes}" if task.device_notes else '')
            # Determine status text
            status_lower = task.status.lower()
            workshop_status = task.workshop_status
            
            if workshop_status == 'Not Solved':
                swahili_status = "TAYARI KUCHUKULIWA, HAIJAPONA"
            elif workshop_status == 'Solved':
                swahili_status = "TAYARI KUCHUKULIWA, IMEPONA"
            elif 'ready' in status_lower or 'completed' in status_lower:
                swahili_status = "TAYARI KUCHUKULIWA"
            elif 'progress' in status_lower or 'diagnostic' in status_lower:
                swahili_status = "INAREKEBISHWA"
            elif 'picked' in status_lower:
                swahili_status = "IMESHACHUKULIWA"
            else:
                swahili_status = task.status.upper()

            final_message = final_message.replace('{status}', swahili_status)
            final_message = final_message.replace('{amount}', str(task.total_cost))

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
