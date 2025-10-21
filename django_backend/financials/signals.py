from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Sum
from .models import Payment, CostBreakdown
from Eapp.models import Task

@receiver([post_save, post_delete], sender=Payment)
def update_task_on_payment_change(sender, instance, **kwargs):
    try:
        if instance.task:
            task = instance.task
            task.paid_amount = task.payments.aggregate(total=Sum('amount'))['total'] or 0
            task.update_payment_status()
            task.save(update_fields=['paid_amount', 'payment_status', 'paid_date'])
    except Task.DoesNotExist:
        pass # Task was deleted, do nothing.

@receiver([post_save, post_delete], sender=CostBreakdown)
def update_task_on_cost_breakdown_change(sender, instance, **kwargs):
    try:
        if instance.task:
            task = instance.task
            task.total_cost = task._calculate_total_cost()
            task.update_payment_status()
            task.save(update_fields=['total_cost', 'payment_status', 'paid_date'])
    except Task.DoesNotExist:
        pass # Task was deleted, do nothing.
