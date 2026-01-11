from django.contrib import admin
from .models import Customer, PhoneNumber, Referrer


class PhoneNumberInline(admin.TabularInline):
    model = PhoneNumber
    extra = 1  # Show 1 empty form for adding new phone numbers


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'customer_type', 'get_phone_numbers', 'created_at')
    search_fields = ('name', 'phone_numbers__phone_number')
    list_filter = ('customer_type', 'created_at')
    inlines = [PhoneNumberInline]

    def get_phone_numbers(self, obj):
        return ', '.join([pn.phone_number for pn in obj.phone_numbers.all()])
    get_phone_numbers.short_description = 'Phone Numbers'


@admin.register(PhoneNumber)
class PhoneNumberAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'customer')
    search_fields = ('phone_number', 'customer__name')


admin.site.register(Referrer)