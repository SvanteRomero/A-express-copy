from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from decimal import Decimal
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
    laptop_model = models.ForeignKey('common.Model', on_delete=models.SET_NULL, null=True, blank=True)
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
    # Snapshot fields for performance and data-proofing
    original_technician_snapshot = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='original_technician_snapshot_tasks'
    )
    original_location_snapshot = models.CharField(max_length=200, null=True, blank=True)
    latest_pickup_at = models.DateTimeField(null=True, blank=True)
    latest_pickup_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='latest_pickup_tasks'
    )
    qc_notes = models.TextField(blank=True, null=True)
    # Derived properties below supply read-only access to event timestamps/users
    # by querying the TaskActivity history.

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.pk:  # Only for new instances
            if self.estimated_cost is not None:
                self.total_cost = self.estimated_cost
        super().save(*args, **kwargs)

    # --- Activity-derived helpers and properties ---
    def _last_activity(self, activity_type):
        return self.activities.filter(type=activity_type).order_by('-timestamp').first()

    @property
    def latest_pickup(self):
        return self._last_activity(TaskActivity.ActivityType.PICKED_UP)

    @property
    def date_out(self):
        act = self.latest_pickup
        return act.timestamp if act else None

    @property
    def sent_out_by(self):
        act = self.latest_pickup
        return act.user if act else None

    @property
    def latest_workshop_activities(self):
        return self.activities.filter(type=TaskActivity.ActivityType.WORKSHOP).order_by('timestamp')

    @property
    def workshop_sent_at(self):
        acts = self.latest_workshop_activities
        return acts.first().timestamp if acts.exists() else None

    @property
    def workshop_returned_at(self):
        acts = self.latest_workshop_activities
        return acts.last().timestamp if acts.exists() and acts.count() > 1 else None

    @property
    def original_technician(self):
        # Prefer snapshot for performance/data-safety; fall back to activity log
        if getattr(self, 'original_technician_snapshot', None):
            return self.original_technician_snapshot
        acts = self.latest_workshop_activities
        return acts.first().user if acts.exists() else None

    @property
    def original_location(self):
        # Prefer snapshot if available
        if getattr(self, 'original_location_snapshot', None):
            return self.original_location_snapshot
        acts = self.latest_workshop_activities
        if not acts.exists():
            return None
        msg = acts.first().message or ''
        if ' at ' in msg:
            try:
                return msg.split(' at ')[-1].strip().rstrip('.')
            except Exception:
                return None
        return None

    @property
    def qc_rejected_at(self):
        act = self._last_activity(TaskActivity.ActivityType.REJECTED)
        return act.timestamp if act else None

    @property
    def qc_rejected_by(self):
        act = self._last_activity(TaskActivity.ActivityType.REJECTED)
        return act.user if act else None

    @property
    def approved_at(self):
        act = self._last_activity(TaskActivity.ActivityType.READY)
        return act.timestamp if act else None

    @property
    def approved_by(self):
        act = self._last_activity(TaskActivity.ActivityType.READY)
        return act.user if act else None

    negotiated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='negotiated_tasks'
    )

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


class TaskActivity(models.Model):
    class ActivityType(models.TextChoices):
        STATUS_UPDATE = 'status_update', _('Status Update')
        NOTE = 'note', _('Note')
        DIAGNOSIS = 'diagnosis', _('Diagnosis')
        CUSTOMER_CONTACT = 'customer_contact', _('Customer Contact')
        INTAKE = 'intake', _('Intake')
        WORKSHOP = 'workshop', _('Workshop')
        REJECTED = 'rejected', _('Rejected')
        READY = 'ready', _('Ready')
        RETURNED = 'returned', _('Returned')
        PICKED_UP = 'picked_up', _('Picked Up')
        DEVICE_NOTE = 'device_note', _('Device Note')
        ASSIGNMENT = 'assignment', _('Assignment')

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    type = models.CharField(max_length=20, choices=ActivityType.choices)
    message = models.TextField()
    details = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f'{self.get_type_display()} for {self.task.title} at {self.timestamp}'

    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = 'Task Activities'
