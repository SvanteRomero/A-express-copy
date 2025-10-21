from django.contrib import admin
from .models import Task, TaskActivity
from django.utils.html import format_html

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'urgency', 'assigned_to', 'created_by', 'due_date', 'created_at')
    list_filter = ('status', 'urgency', 'assigned_to', 'created_by')
    search_fields = ('title', 'description')
    autocomplete_fields = ['assigned_to', 'created_by']
    date_hierarchy = 'created_at'

@admin.register(TaskActivity)
class TaskActivityAdmin(admin.ModelAdmin):
    list_display = ('task', 'user', 'timestamp', 'type', 'message')
    list_filter = ('type', 'user')
    search_fields = ('message',)