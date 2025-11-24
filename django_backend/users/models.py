from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
import os
from uuid import uuid4

def user_profile_picture_path(instance, filename):
    """Generate file path for user profile pictures"""
    ext = filename.split('.')[-1]
    filename = f"{uuid4().hex}.{ext}"
    return os.path.join('profile_pictures', str(instance.id), filename)

class CustomUserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'Manager')
        
        return self.create_user(username, email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        MANAGER = 'Manager', _('Manager')
        FRONT_DESK = 'Front Desk', _('Front Desk')
        TECHNICIAN = 'Technician', _('Technician')
        ACCOUNTANT = 'Accountant', _('Accountant')
    
    profile_picture = models.ImageField(
        upload_to=user_profile_picture_path,
        blank=True,
        null=True,
        verbose_name=_('Profile Picture'),
        default='profile_pictures/default.png'
    )
    username = models.CharField(max_length=50, unique=True, verbose_name=_('Username'))
    password = models.CharField(max_length=128, verbose_name=_('Password'))
    email = models.EmailField(max_length=100, unique=True, verbose_name=_('Email'))
    first_name = models.CharField(max_length=50, verbose_name=_('First Name'))
    last_name = models.CharField(max_length=50, verbose_name=_('Last Name'))
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name=_('Phone'))
    role = models.CharField(max_length=20, choices=Role.choices, verbose_name=_('Role'))
    is_workshop = models.BooleanField(default=False, verbose_name=_('Workshop'))
    is_active = models.BooleanField(default=True, verbose_name=_('Active'))
    created_at = models.DateTimeField(default=timezone.now, verbose_name=_('Created At'))
    last_login = models.DateTimeField(null=True, blank=True, verbose_name=_('Last Login'))
    
    is_staff = models.BooleanField(default=False, verbose_name=_('Staff Status'))
    
    objects = CustomUserManager()
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'first_name', 'last_name', 'role']
    
    class Meta:
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        ordering = ['id']
    
    def __str__(self):
        return f"{self.username} ({self.get_full_name()})"
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def get_short_name(self):
        return self.first_name
    
    def get_profile_picture_url(self):
        """Return the URL for the user's profile picture or a default"""
        if self.profile_picture and hasattr(self.profile_picture, 'url'):
            return self.profile_picture.url
        return '/api/media/profile_pictures/default.png'
    
    def save(self, *args, **kwargs):
        # Update last_login if password is being set (during login)
        if 'update_fields' in kwargs and 'last_login' in kwargs['update_fields']:
            self.last_login = timezone.now()
        
        # Delete old profile picture when updating to a new one
        if self.pk:
            try:
                old_instance = User.objects.get(pk=self.pk)
                if old_instance.profile_picture and old_instance.profile_picture != self.profile_picture:
                    old_instance.profile_picture.delete(save=False)
            except User.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Delete the profile picture when user is deleted"""
        if self.profile_picture:
            self.profile_picture.delete(save=False)
        super().delete(*args, **kwargs)
    
    def has_add_user_permission(self):
        """Check if user has permission to add other users"""
        return self.is_superuser or self.role == 'Manager'


class Session(models.Model):
    """Track user sessions for session management and revocation."""
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    jti = models.CharField(max_length=255, null=True, blank=True)
    # Storing raw refresh tokens is sensitive; consider hashing/encrypting in production.
    refresh_token = models.TextField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, null=True, blank=True)
    ip_address = models.CharField(max_length=100, null=True, blank=True)
    device_name = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_revoked = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Session {self.id} for {self.user.username}"


class AuditLog(models.Model):
    """Simple audit log for security and administrative events."""
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=200)
    resource_type = models.CharField(max_length=100, null=True, blank=True)
    resource_id = models.CharField(max_length=200, null=True, blank=True)
    ip_address = models.CharField(max_length=100, null=True, blank=True)
    user_agent = models.CharField(max_length=500, null=True, blank=True)
    severity = models.CharField(max_length=20, default='info')
    metadata = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.created_at}] {self.action} by {self.user}"