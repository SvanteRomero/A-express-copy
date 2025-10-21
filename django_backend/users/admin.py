from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User
from django.utils.html import format_html

class UserAdmin(BaseUserAdmin):
    
    list_display = ('id', 'username', 'email', 'first_name', 'last_name', 
                    'role', 'is_active', 'is_staff', 'last_login', 'created_at', 
                    'profile_picture_thumbnail')
    list_filter = ('role', 'is_active', 'is_staff', 'created_at')
    
    def profile_picture_thumbnail(self, obj):
        if obj.profile_picture:
            return format_html(
                '<img src="{}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;" />',
                obj.profile_picture.url
            )
        return "No Image"
    profile_picture_thumbnail.short_description = 'Profile Picture'
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email', 'phone', 'profile_picture')}),
        ('Role & Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 
                                            'groups', 'user_permissions')}),
        ('Important Dates', {'fields': ('last_login', 'created_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'first_name', 'last_name', 'phone', 
                        'role', 'password', 'is_active', 'is_staff', 'profile_picture'),
        }),
    )
    
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('id',)
    readonly_fields = ('created_at', 'last_login', 'id', 'profile_picture_preview')
    
    def profile_picture_preview(self, obj):
        if obj.profile_picture:
            return format_html(
                '<img src="{}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;" />',
                obj.profile_picture.url
            )
        return "No profile picture uploaded"
    profile_picture_preview.short_description = 'Profile Picture Preview'
    
    filter_horizontal = ('groups', 'user_permissions',)

admin.site.register(User, UserAdmin)
