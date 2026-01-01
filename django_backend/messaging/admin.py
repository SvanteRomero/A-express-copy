from django.contrib import admin
from .models import MessageLog


@admin.register(MessageLog)
class MessageLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'task', 'recipient_phone', 'status', 'sent_by', 'sent_at']
    list_filter = ['status', 'sent_at']
    search_fields = ['recipient_phone', 'message_content', 'task__title']
    readonly_fields = ['sent_at']
    ordering = ['-sent_at']
