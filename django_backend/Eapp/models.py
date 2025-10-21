from django.db import models
from django.utils import timezone
from django.core.exceptions import PermissionDenied
from django.utils.translation import gettext_lazy as _
from customers.models import Customer, Referrer
from decimal import Decimal
from datetime import datetime
from users.models import User

def get_current_date():
    return timezone.now().date()
    




class Task(models.Model):
    class Status(models.TextChoices):
        PENDING = 'Pending', _('Pending')
        IN_PROGRESS = 'In Progress', _('In Progress')
        AWAITING_PARTS = 'Awaiting Parts', _('Awaiting Parts')
        COMPLETED = 'Completed', _('Completed')
        READY_FOR_PICKUP = 'Ready for Pickup', _('Ready for Pickup')
        PICKED_UP = 'Picked Up', _('Picked Up')
        TERMINATED = 'Terminated', _('Terminated')

    class Urgency(models.TextChoices):
        YUPO = 'Yupo', _('Yupo')
        KATOKA_KIDOGO = 'Katoka kidogo', _('Katoka kidogo')
        KAACHA = 'Kaacha', _('Kaacha')
        EXPEDITED = 'Expedited', _('Expedited')
        INA_HARAKA = 'Ina Haraka', _('Ina Haraka')

    class PaymentStatus(models.TextChoices):
        UNPAID = 'Unpaid', _('Unpaid')
        PARTIALLY_PAID = 'Partially Paid', _('Partially Paid')
        FULLY_PAID = 'Fully Paid', _('Fully Paid')
        REFUNDED = 'Refunded', _('Refunded')

    class DeviceType(models.TextChoices):
        FULL = 'Full', _('Full')
        NOT_FULL = 'Not Full', _('Not Full')
        MOTHERBOARD_ONLY = 'Motherboard Only', _('Motherboard Only')

    class WorkshopStatus(models.TextChoices):
        IN_WORKSHOP = 'In Workshop', _('In Workshop')
        SOLVED = 'Solved', _('Solved')
        NOT_SOLVED = 'Not Solved', _('Not Solved')

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )

    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks'
    )
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tasks')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateField(null=True, blank=True)

    # New fields
    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE, related_name='tasks')
    brand = models.ForeignKey('common.Brand', on_delete=models.SET_NULL, null=True, blank=True)
    device_type = models.CharField(max_length=20, choices=DeviceType.choices, default=DeviceType.FULL)
    device_notes = models.TextField(blank=True)
    laptop_model = models.CharField(max_length=100)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
        db_index=True
    )
    current_location = models.CharField(max_length=100)
    urgency = models.CharField(max_length=20, choices=Urgency.choices, default=Urgency.YUPO)
    date_in = models.DateField(default=get_current_date)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_tasks'
    )
    paid_date = models.DateField(null=True, blank=True)
    next_payment_date = models.DateField(null=True, blank=True)
    date_out = models.DateTimeField(null=True, blank=True)
    sent_out_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_out_tasks'
    )
    negotiated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='negotiated_tasks'
    )
    is_debt = models.BooleanField(default=False)
    is_referred = models.BooleanField(default=False)
    referred_by = models.ForeignKey(
        'customers.Referrer', on_delete=models.SET_NULL, null=True, blank=True, related_name='referred_tasks'
    )

    # Workshop fields
    workshop_status = models.CharField(
        max_length=20,
        choices=WorkshopStatus.choices,
        null=True,
        blank=True
    )
    workshop_location = models.ForeignKey(
        'common.Location', on_delete=models.SET_NULL, null=True, blank=True, related_name='workshop_tasks'
    )
    workshop_technician = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='workshop_assigned_tasks'
    )
    original_technician = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_to_workshop_tasks'
    )
    workshop_sent_at = models.DateTimeField(null=True, blank=True)
    workshop_returned_at = models.DateTimeField(null=True, blank=True)
    original_location = models.CharField(max_length=100, blank=True, null=True)
    qc_notes = models.TextField(blank=True, null=True)
    qc_rejected_at = models.DateTimeField(null=True, blank=True)
    qc_rejected_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='rejected_tasks'
    )

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.pk:
            original = Task.objects.get(pk=self.pk)
            if original.status == self.Status.IN_PROGRESS and self.assigned_to != original.assigned_to:
                raise PermissionDenied("Cannot change the assigned technician for a task that is in progress.")
        super().save(*args, **kwargs)

    def _calculate_total_cost(self):
        estimated_cost = self.estimated_cost or Decimal('0.00')
        additive_costs = sum(item.amount for item in self.cost_breakdowns.filter(cost_type='Additive'))
        subtractive_costs = sum(item.amount for item in self.cost_breakdowns.filter(cost_type='Subtractive'))
        return estimated_cost + additive_costs - subtractive_costs

    def update_payment_status(self):
        if self.paid_amount == 0:
            self.payment_status = self.PaymentStatus.UNPAID
        elif self.paid_amount < self.total_cost:
            self.payment_status = self.PaymentStatus.PARTIALLY_PAID
        elif self.paid_amount >= self.total_cost:
            self.payment_status = self.PaymentStatus.FULLY_PAID
            if not self.paid_date:
                self.paid_date = timezone.now().date()


class TaskActivity(models.Model):
    class ActivityType(models.TextChoices):
        STATUS_UPDATE = 'status_update', _('Status Update')
        NOTE = 'note', _('Note')
        DIAGNOSIS = 'diagnosis', _('Diagnosis')
        CUSTOMER_CONTACT = 'customer_contact', _('Customer Contact')
        INTAKE = 'intake', _('Intake')
        WORKSHOP = 'workshop', _('Workshop')
        REJECTED = 'rejected', _('Rejected')
        RETURNED = 'returned', _('Returned')
        PICKED_UP = 'picked_up', _('Picked Up')
        DEVICE_NOTE = 'device_note', _('Device Note')

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    type = models.CharField(max_length=20, choices=ActivityType.choices)
    message = models.TextField()

    def __str__(self):
        return f'{self.get_type_display()} for {self.task.title} at {self.timestamp}'

    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = 'Task Activities'

