from rest_framework import serializers
from .models import SystemSettings


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            'company_name',
            'company_phone_numbers',
            'auto_sms_on_task_creation',
            'auto_pickup_reminders_enabled',
            'pickup_reminder_hours',
            'updated_at'
        ]
        read_only_fields = ['updated_at']

