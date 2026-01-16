from django.contrib import admin
from .models import Brand, Location, Model

admin.site.register(Brand)
admin.site.register(Location)
@admin.register(Model)
class ModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'brand')
    list_filter = ('brand',)
    search_fields = ('name', 'brand__name')