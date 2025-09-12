from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.core.exceptions import PermissionDenied
from django.utils.translation import gettext_lazy as _
import os
from uuid import uuid4
from decimal import Decimal


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
    
def user_profile_picture_path(instance, filename):
    """Generate file path for user profile pictures"""
    ext = filename.split('.')[-1]
    filename = f"{uuid4().hex}.{ext}"
    return os.path.join('profile_pictures', str(instance.id), filename)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        MANAGER = 'Manager', _('Manager')
        FRONT_DESK = 'Front Desk', _('Front Desk')
        TECHNICIAN = 'Technician', _('Technician')
    
    profile_picture = models.ImageField(
        upload_to=user_profile_picture_path,
        blank=True,
        null=True,
        verbose_name=_('Profile Picture'),
        default='profile_pictures/default.png'
    )
    username = models.CharField(max_length=50, unique=True, verbose_name=_('Username'))
    email = models.EmailField(max_length=100, unique=True, verbose_name=_('Email'))
    first_name = models.CharField(max_length=50, verbose_name=_('First Name'))
    last_name = models.CharField(max_length=50, verbose_name=_('Last Name'))
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name=_('Phone'))
    role = models.CharField(max_length=20, choices=Role.choices, verbose_name=_('Role'))
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
        ordering = ['id']  # Changed from 'user_id' to 'id'
    
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
        return '/media/profile_pictures/default.png'
    
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
    
    
    
    
    
    def save(self, *args, **kwargs):
        # Update last_login if password is being set (during login)
        if 'update_fields' in kwargs and 'last_login' in kwargs['update_fields']:
            self.last_login = timezone.now()
        super().save(*args, **kwargs)
    
    def has_add_user_permission(self):
        """Check if user has permission to add other users"""
        return self.is_superuser or self.role == 'Manager'
    

class Task(models.Model):
    class Status(models.TextChoices):
        PENDING = 'Pending', _('Pending')
        IN_PROGRESS = 'In Progress', _('In Progress')
        AWAITING_PARTS = 'Awaiting Parts', _('Awaiting Parts')
        COMPLETED = 'Completed', _('Completed')
        PICKED_UP = 'Picked Up', _('Picked Up')
        CANCELLED = 'Cancelled', _('Cancelled')

    class Priority(models.TextChoices):
        LOW = 'Low', _('Low')
        MEDIUM = 'Medium', _('Medium')
        HIGH = 'High', _('High')

    class PaymentStatus(models.TextChoices):
        UNPAID = 'Unpaid', _('Unpaid')
        PARTIALLY_PAID = 'Partially Paid', _('Partially Paid')
        FULLY_PAID = 'Fully Paid', _('Fully Paid')
        REFUNDED = 'Refunded', _('Refunded')

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM
    )
    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks'
    )
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tasks')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateField(null=True, blank=True)

    # New fields
    customer_name = models.CharField(max_length=100)
    customer_phone = models.CharField(max_length=20)
    customer_email = models.EmailField(max_length=100, blank=True, null=True)
    laptop_make = models.CharField(max_length=50)
    laptop_model = models.CharField(max_length=100)
    serial_number = models.CharField(max_length=100)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID
    )
    current_location = models.CharField(max_length=100)
    urgency = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    date_in = models.DateField(default=timezone.now)
    approved_date = models.DateField(null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    date_out = models.DateField(null=True, blank=True)
    negotiated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='negotiated_tasks'
    )

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']

    @property
    def outstanding_balance(self):
        if not self.total_cost:
            return Decimal('0.00')
        paid = sum(p.amount for p in self.payments.all()) or Decimal('0.00')
        return self.total_cost - paid

    def update_payment_status(self):
        paid = sum(p.amount for p in self.payments.all()) or Decimal('0.00')
        total = self.total_cost or Decimal('0.00')
        if paid == 0:
            self.payment_status = self.PaymentStatus.UNPAID
        elif paid < total:
            self.payment_status = self.PaymentStatus.PARTIALLY_PAID
        elif paid == total:
            self.payment_status = self.PaymentStatus.FULLY_PAID
            if not self.paid_date:
                self.paid_date = timezone.now().date()
        else:
            self.payment_status = self.PaymentStatus.REFUNDED
        self.save(update_fields=['payment_status', 'paid_date'])


class TaskActivity(models.Model):
    class ActivityType(models.TextChoices):
        STATUS_UPDATE = 'status_update', _('Status Update')
        NOTE = 'note', _('Note')
        DIAGNOSIS = 'diagnosis', _('Diagnosis')
        CUSTOMER_CONTACT = 'customer_contact', _('Customer Contact')
        INTAKE = 'intake', _('Intake')

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    type = models.CharField(max_length=20, choices=ActivityType.choices)
    message = models.TextField()

    def __str__(self):
        return f'{self.get_type_display()} for {self.task.title} at {self.timestamp}'

    class Meta:
        ordering = ['-timestamp']


class Payment(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = 'Cash', _('Cash')
        CREDIT_CARD = 'Credit Card', _('Credit Card')
        DEBIT_CARD = 'Debit Card', _('Debit Card')
        CHECK = 'Check', _('Check')
        DIGITAL_PAYMENT = 'Digital Payment', _('Digital Payment')

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(default=timezone.now)
    method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    reference = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f'Payment of {self.amount} for {self.task.title} on {self.date}'

    class Meta:
        ordering = ['-date']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.task.update_payment_status()