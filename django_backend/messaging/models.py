from django.db import models
from django.conf import settings


class MessageLog(models.Model):
    """
    Log of all SMS messages sent through the system.
    """
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('pending', 'Pending'),
    ]
    
    task = models.ForeignKey(
        'Eapp.Task',
        on_delete=models.CASCADE,
        related_name='message_logs',
        help_text='The task this message is related to'
    )
    recipient_phone = models.CharField(
        max_length=20,
        help_text='Phone number the message was sent to'
    )
    message_content = models.TextField(
        help_text='Content of the SMS message'
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending'
    )
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_messages',
        help_text='User who sent the message'
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    response_data = models.JSONField(
        null=True,
        blank=True,
        help_text='Response data from Briq API'
    )
    
    class Meta:
        ordering = ['-sent_at']
        verbose_name = 'Message Log'
        verbose_name_plural = 'Message Logs'
    
    def __str__(self):
        return f"SMS to {self.recipient_phone} - {self.status}"


class MessageTemplate(models.Model):
    """
    Reusable SMS templates for bulk messaging.
    """
    name = models.CharField(max_length=100, unique=True)
    content = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Message Template'
        verbose_name_plural = 'Message Templates'

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"
