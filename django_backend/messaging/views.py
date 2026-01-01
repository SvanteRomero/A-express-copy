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
