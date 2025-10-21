from django.contrib import admin
from .models import PaymentMethod, PaymentCategory, Payment, CostBreakdown, Account, ExpenditureRequest

admin.site.register(PaymentMethod)
admin.site.register(PaymentCategory)
admin.site.register(Payment)
admin.site.register(CostBreakdown)
admin.site.register(Account)
admin.site.register(ExpenditureRequest)