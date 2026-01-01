from rest_framework import serializers


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
