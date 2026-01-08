from django.db import models


class SystemSettings(models.Model):
    """
    Singleton model for system-wide settings.
    Only one instance should exist.
    """
    # Company Information
    company_name = models.CharField(
        max_length=200,
        default='A PLUS EXPRESS TECHNOLOGIES LTD',
        help_text='Company name displayed in SMS messages'
    )
    company_phone_numbers = models.JSONField(
        default=list,
        blank=True,
        help_text='List of company contact phone numbers'
    )
    
    # Notification Settings
    auto_sms_on_task_creation = models.BooleanField(
        default=True,
        help_text='Automatically send SMS to customer when a new task is created'
    )
    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'System Settings'
        verbose_name_plural = 'System Settings'

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton pattern)
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance."""
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings

    def __str__(self):
        return "System Settings"

