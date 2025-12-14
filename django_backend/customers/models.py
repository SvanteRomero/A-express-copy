from django.db import models
from django.utils.translation import gettext_lazy as _

class Customer(models.Model):
    class CustomerType(models.TextChoices):
        NORMAL = 'Normal', _('Normal')
        REPAIRMAN = 'Repairman', _('Repairman')

    name = models.CharField(max_length=100, db_index=True)
    customer_type = models.CharField(
        max_length=20,
        choices=CustomerType.choices,
        default=CustomerType.NORMAL,
        verbose_name=_('Customer Type')
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']

class PhoneNumber(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='phone_numbers')
    phone_number = models.CharField(max_length=500, unique=True)  # Longer for encrypted values

    def __str__(self):
        return self.phone_number

class Referrer(models.Model):
    name = models.CharField(max_length=100, unique=True)
    phone = models.CharField(max_length=500, blank=True, null=True)  # Longer for encrypted values
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        