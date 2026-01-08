from rest_framework import serializers
from .models import SystemSettings


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = ['auto_sms_on_task_creation', 'updated_at']
        read_only_fields = ['updated_at']
