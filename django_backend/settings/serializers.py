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
            'auto_debt_reminders_enabled',
            'debt_reminder_hours',
            'debt_reminder_max_days',
            'auto_sms_on_ready_for_pickup',
            'auto_sms_on_picked_up',
            'storage_fee_per_day',
            'pickup_deadline_days',
            'updated_at'
        ]
        read_only_fields = ['updated_at']

