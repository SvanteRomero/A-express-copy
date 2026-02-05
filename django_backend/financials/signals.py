from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Sum
from .models import Payment, CostBreakdown, Account
from Eapp.models import Task

@receiver([post_save, post_delete], sender=Payment)
def update_task_on_payment_change(sender, instance, **kwargs):
    try:
        if instance.task:
            task = instance.task
            task.paid_amount = task.payments.filter(amount__gte=0).aggregate(total=Sum('amount'))['total'] or 0
            task.update_payment_status()
            # Clear is_debt if fully paid
            if task.is_debt and task.payment_status == task.PaymentStatus.FULLY_PAID:
                task.is_debt = False
            task.save(update_fields=['paid_amount', 'payment_status', 'is_debt'])
            
            # Broadcast payment update for live cross-user sync
            from .broadcasts import broadcast_payment_update
            broadcast_payment_update(task_id=task.title)
    except Task.DoesNotExist:
        pass # Task was deleted, do nothing.

@receiver([post_save, post_delete], sender=CostBreakdown)
def update_task_on_cost_breakdown_change(sender, instance, **kwargs):
    try:
        if instance.task:
            task = instance.task
            task.total_cost = task._calculate_total_cost()
            task.update_payment_status()
            task.save(update_fields=['total_cost', 'payment_status'])
            
            # Broadcast payment update for live cross-user sync
            from .broadcasts import broadcast_payment_update
            broadcast_payment_update(task_id=task.title)
    except Task.DoesNotExist:
        pass # Task was deleted, do nothing.

@receiver(post_save, sender=Account)
def broadcast_account_change(sender, instance, **kwargs):
    """Broadcast account changes for live balance updates."""
    from .broadcasts import broadcast_account_update
    broadcast_account_update()


@receiver(post_save, sender=Account)
def create_payment_method_for_account(sender, instance, created, **kwargs):
    """
    Automatically create a PaymentMethod when a new Account is created.
    """
    if created:
        from .models import PaymentMethod
        # Check if a payment method with this name already exists to avoid unique constraint errors
        if not PaymentMethod.objects.filter(name=instance.name).exists():
            PaymentMethod.objects.create(
                name=instance.name,
                account=instance,
                is_user_selectable=True
            )


@receiver([post_save, post_delete], sender=Payment)
def update_account_balance(sender, instance, **kwargs):
    """
    Update the associated Account balance when a Payment is added/changed/deleted.
    Uses database aggregation to ensure accuracy.
    """
    # 1. Get payment method from instance
    payment_method = instance.method
    
    # If valid method and it has a linked account
    if payment_method and payment_method.account:
        account = payment_method.account
        
        # 2. Calculate new balance
        # Sum of all payments using this method's account
        from django.db.models import Sum
        
        result = Payment.objects.filter(method__account=account).aggregate(total=Sum('amount'))
        new_balance = result['total'] or 0
        
        # 3. Update account
        if account.balance != new_balance:
            account.balance = new_balance
            account.save(update_fields=['balance'])


