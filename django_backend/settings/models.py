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
    
    # Pickup Reminder Settings
    auto_pickup_reminders_enabled = models.BooleanField(
        default=False,
        help_text='Automatically send SMS reminders for tasks ready for pickup'
    )
    pickup_reminder_hours = models.PositiveIntegerField(
        default=24,
        help_text='Hours between pickup reminder messages'
    )
    
    # Debt Reminder Settings
    auto_debt_reminders_enabled = models.BooleanField(
        default=False,
        help_text='Automatically send SMS reminders for tasks with outstanding debts'
    )
    debt_reminder_hours = models.PositiveIntegerField(
        default=72,  # Every 3 days
        help_text='Hours between debt reminder messages'
    )
    debt_reminder_max_days = models.PositiveIntegerField(
        default=30,
        help_text='Stop sending reminders after this many days since pickup'
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

