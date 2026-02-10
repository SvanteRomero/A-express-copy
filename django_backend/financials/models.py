from django.db import models
from django.utils.translation import gettext_lazy as _
from users.models import User
from django.utils import timezone

def get_current_date():
    return timezone.localdate()

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
    method = models.ForeignKey(PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True)
    payment_method_name = models.CharField(max_length=100, blank=True, null=True)
    description = models.CharField(max_length=255, default='Customer Payment', blank=True)
    category = models.ForeignKey(
        PaymentCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments'
    )

    def save(self, *args, **kwargs):
        if self.method and not self.payment_method_name:
            self.payment_method_name = self.method.name
        super().save(*args, **kwargs)

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


class ApprovalRequest(models.Model):
    """
    Abstract base model for all approval requests.
    Uses multi-table inheritance for polymorphism.
    Subclasses: TransactionRequest, DebtRequest
    """
    class Status(models.TextChoices):
        PENDING = 'Pending', _('Pending')
        APPROVED = 'Approved', _('Approved')
        REJECTED = 'Rejected', _('Rejected')
    
    # Common approval fields
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requester = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='%(class)s_requests_made'
    )
    approver = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='%(class)s_requests_approved'
    )
    
    # Snapshot fields to preserve names if entities are deleted
    requester_name = models.CharField(max_length=150, blank=True, null=True)
    approver_name = models.CharField(max_length=150, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        # Auto-populate snapshot fields
        if self.requester and not self.requester_name:
            self.requester_name = self.requester.get_full_name() or self.requester.username
        if self.approver and not self.approver_name:
            self.approver_name = self.approver.get_full_name() or self.approver.username
        super().save(*args, **kwargs)
    
    # Abstract methods to be implemented by subclasses
    def get_description(self):
        """Return human-readable description of the request."""
        raise NotImplementedError(f"{self.__class__.__name__} must implement get_description()")
    
    def get_amount(self):
        """Return the monetary amount (if applicable), or None."""
        raise NotImplementedError(f"{self.__class__.__name__} must implement get_amount()")
    
    def get_type_display(self):
        """Return the request type for display (e.g., 'Expenditure', 'Debt')."""
        raise NotImplementedError(f"{self.__class__.__name__} must implement get_type_display()")


class TransactionRequest(ApprovalRequest):
    """
    Request for financial transactions (Expenditure or Revenue).
    Inherits common approval fields from ApprovalRequest.
    - Expenditure: Money going out (creates negative Payment)
    - Revenue: Money coming in (creates positive Payment)
    """
    class TransactionType(models.TextChoices):
        EXPENDITURE = 'Expenditure', _('Expenditure')
        REVENUE = 'Revenue', _('Revenue')

    # Transaction-specific fields
    transaction_type = models.CharField(
        max_length=20, 
        choices=TransactionType.choices, 
        default=TransactionType.EXPENDITURE
    )
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    task = models.ForeignKey('Eapp.Task', on_delete=models.SET_NULL, null=True, blank=True, related_name='transaction_requests')
    category = models.ForeignKey(PaymentCategory, on_delete=models.PROTECT)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True)
    payment_method_name = models.CharField(max_length=100, blank=True, null=True)
    
    # cost_type only applies to Expenditures linked to tasks
    cost_type = models.CharField(
        max_length=20, 
        choices=CostBreakdown.CostType.choices, 
        null=True, 
        blank=True
    )

    def save(self, *args, **kwargs):
        # Snapshot payment method name
        if self.payment_method and not self.payment_method_name:
            self.payment_method_name = self.payment_method.name
        super().save(*args, **kwargs)
    
    # Implement abstract methods
    def get_description(self):
        return self.description
    
    def get_amount(self):
        return self.amount
    
    def get_type_display(self):
        return self.get_transaction_type_display()

    def __str__(self):
        return f'{self.transaction_type} request for {self.amount} by {self.requester_name or "Unknown"}'

    class Meta:
        verbose_name_plural = 'Transaction Requests'


class DebtRequest(ApprovalRequest):
    """
    Request to mark a task as debt.
    Inherits common approval fields from ApprovalRequest.
    """
    # Debt-specific fields
    task = models.ForeignKey('Eapp.Task', on_delete=models.CASCADE, related_name='debt_requests')
    task_title = models.CharField(max_length=255, blank=True)
    
    def save(self, *args, **kwargs):
        # Snapshot task title
        if self.task and not self.task_title:
            self.task_title = self.task.title
        super().save(*args, **kwargs)
    
    # Implement abstract methods
    def get_description(self):
        return f"Mark {self.task_title} as debt"
    
    def get_amount(self):
        # Return outstanding balance if available
        if hasattr(self.task, 'outstanding_balance'):
            return self.task.outstanding_balance
        return None
    
    def get_type_display(self):
        return "Debt Request"
    
    def __str__(self):
        return f'Debt request for {self.task_title} by {self.requester_name or "Unknown"}'
    
    class Meta:
        verbose_name_plural = 'Debt Requests'


# Backwards compatibility alias
ExpenditureRequest = TransactionRequest