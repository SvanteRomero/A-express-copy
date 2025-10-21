from django.db.models.signals import post_save
from django.dispatch import receiver
from financials.models import Account, PaymentMethod, Payment
from django.db.models import F



@receiver(post_save, sender=Account)
def create_payment_method_for_account(sender, instance, created, **kwargs):
    if created:
        payment_method, _ = PaymentMethod.objects.get_or_create(name=instance.name)
        payment_method.account = instance
        payment_method.save()

@receiver(post_save, sender=Payment)
def update_account_balance_on_payment(sender, instance, created, **kwargs):
    if created:
        if instance.method and instance.method.account:
            account = instance.method.account
            account.balance = F('balance') + instance.amount
            account.save()
