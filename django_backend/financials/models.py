from django.db import models
from django.utils.translation import gettext_lazy as _
from users.models import User
from django.utils import timezone

def get_current_date():
    return timezone.now().date()

class PaymentMethod(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_user_selectable = models.BooleanField(default=True)
    account = models.OneToOneField('Account', on_delete=models.CASCADE, null=True, blank=True, related_name='payment_method')

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Payment Methods'


class PaymentCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Payment Categories'


class Payment(models.Model):

    task = models.ForeignKey('Eapp.Task', on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(default=get_current_date)
    method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT)
    description = models.CharField(max_length=255, default='Customer Payment', blank=True)
    category = models.ForeignKey(
        PaymentCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments'
    )

    def __str__(self):
        if self.task:
            return f'Payment of {self.amount} for {self.task.title} on {self.date}'
        return f'Payment of {self.amount} on {self.date}'

    class Meta:
        ordering = ['-date']





class CostBreakdown(models.Model):
    class CostType(models.TextChoices):
        ADDITIVE = 'Additive', _('Additive')
        SUBTRACTIVE = 'Subtractive', _('Subtractive')
        INCLUSIVE = 'Inclusive', _('Inclusive')

    class Status(models.TextChoices):
        PENDING = 'Pending', _('Pending')
        APPROVED = 'Approved', _('Approved')
        REJECTED = 'Rejected', _('Rejected')


    task = models.ForeignKey('Eapp.Task', on_delete=models.CASCADE, related_name='cost_breakdowns')
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    cost_type = models.CharField(max_length=20, choices=CostType.choices, default=CostType.INCLUSIVE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPROVED)
    category = models.CharField(max_length=100, default='Inclusive')
    created_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True, null=True)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True)



    def __str__(self):
        return f'{self.get_cost_type_display()} cost of {self.amount} for {self.task.title}'

    class Meta:
        ordering = ['created_at']
        verbose_name_plural = 'Cost Breakdowns'


class Account(models.Model):
    name = models.CharField(max_length=100, unique=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class ExpenditureRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'Pending', _('Pending')
        APPROVED = 'Approved', _('Approved')
        REJECTED = 'Rejected', _('Rejected')

    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    task = models.ForeignKey('Eapp.Task', on_delete=models.SET_NULL, null=True, blank=True, related_name='expenditure_requests')
    category = models.ForeignKey(PaymentCategory, on_delete=models.PROTECT)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    cost_type = models.CharField(max_length=20, choices=CostBreakdown.CostType.choices, default=CostBreakdown.CostType.INCLUSIVE)

    requester = models.ForeignKey(User, on_delete=models.PROTECT, related_name='expenditure_requests_made')
    approver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenditure_requests_approved')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Expenditure request for {self.amount} by {self.requester.username}'

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Expenditure Requests'