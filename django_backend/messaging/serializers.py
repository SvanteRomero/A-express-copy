from rest_framework import serializers
from .models import MessageTemplate, MessageLog


class SendSMSSerializer(serializers.Serializer):
    """Serializer for sending SMS to a customer."""
    phone_number = serializers.CharField(
        max_length=20,
        help_text='Phone number to send SMS to (e.g., 255712345678)'
    )
    message = serializers.CharField(
        max_length=1000,
        help_text='SMS message content'
    )
    
    def validate_phone_number(self, value):
        """Clean and validate phone number."""
        # Remove spaces, dashes, plus signs
        cleaned = value.replace(' ', '').replace('-', '').replace('+', '')
        
        # Must be digits only
        if not cleaned.isdigit():
            raise serializers.ValidationError("Phone number must contain only digits")
        
        # Must be at least 9 digits (Tanzania numbers without country code)
        if len(cleaned) < 9:
            raise serializers.ValidationError("Phone number is too short")
        
        return cleaned
    
    def validate_message(self, value):
        """Validate message content."""
        if not value.strip():
            raise serializers.ValidationError("Message cannot be empty")
        return value.strip()


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = ['id', 'name', 'content', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class BulkSendSMSSerializer(serializers.Serializer):
    """Serializer for sending bulk SMS."""
    recipients = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        help_text='List of objects with task_id and phone'
    )
    message = serializers.CharField(
        max_length=1000,
        required=False,
        help_text='Manual message content (overrides template choice if provided)'
    )
    template_id = serializers.IntegerField(
        required=False,
        help_text='ID of the template to use'
    )

    def validate(self, data):
        if not data.get('message') and not data.get('template_id'):
            raise serializers.ValidationError("Either 'message' or 'template_id' must be provided.")
        return data


class MessageLogSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.CharField(source='sent_by.get_full_name', read_only=True)
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = MessageLog
        fields = ['id', 'task_id', 'recipient_phone', 'message_content', 'status', 'sent_by_name', 'sent_at', 'customer_name']
        read_only_fields = ['id', 'task_id', 'recipient_phone', 'message_content', 'status', 'sent_by_name', 'sent_at', 'customer_name']

    def get_customer_name(self, obj):
        try:
            if obj.task and obj.task.customer:
                return obj.task.customer.name
        except AttributeError:
            pass
        return "Unknown"
