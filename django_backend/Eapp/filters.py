import django_filters
from .models import Task
from financials.models import Payment
from django.utils import timezone
from django.db.models import Q

class TaskFilter(django_filters.FilterSet):
    created_at = django_filters.DateFromToRangeFilter()
    updated_at = django_filters.DateFromToRangeFilter()
    status = django_filters.CharFilter(method='filter_status')

    activity_user = django_filters.NumberFilter(method='filter_activity_user')
    
    # For messaging compose view: filter by template type
    template_filter = django_filters.CharFilter(method='filter_by_template')
    
    # Search by customer name, phone, task title
    search = django_filters.CharFilter(method='search_filter')

    class Meta:
        model = Task
        fields = {
            'assigned_to': ['exact'],
            'customer': ['exact'],
            'created_by': ['exact'],
            'is_debt': ['exact'],
            'workshop_technician': ['exact'],
            'workshop_status': ['exact', 'in'],
        }

    def filter_status(self, queryset, name, value):
        statuses = value.split(',')
        return queryset.filter(status__in=statuses)

    def filter_activity_user(self, queryset, name, value):
        return queryset.filter(activities__user_id=value).distinct()
    
    def filter_by_template(self, queryset, name, value):
        """
        Filter tasks based on template type for bulk messaging.
        """
        if value == 'ready_for_pickup':
            return queryset.filter(status='Ready for Pickup')
        elif value == 'repair_in_progress':
            # Exclude finished statuses
            finished_statuses = ['Ready for Pickup', 'Picked Up', 'Completed', 'Terminated', 'Cancelled']
            return queryset.exclude(status__in=finished_statuses)
        elif value == 'debt_reminder':
            return queryset.filter(is_debt=True, status='Picked Up')
        return queryset
    
    def search_filter(self, queryset, name, value):
        """
        Search by customer name, phone number, or task title.
        """
        return queryset.filter(
            Q(customer__name__icontains=value) |
            Q(customer__phone_numbers__phone_number__icontains=value) |
            Q(title__icontains=value)
        ).distinct()


class PaymentFilter(django_filters.FilterSet):
    task__title = django_filters.CharFilter(lookup_expr='icontains')
    method_name = django_filters.CharFilter(field_name='method__name', lookup_expr='iexact')
    category = django_filters.CharFilter(field_name='category__name', lookup_expr='iexact')
    is_refunded = django_filters.BooleanFilter(method='filter_refunded')
    date = django_filters.DateFilter(field_name='date', lookup_expr='exact', initial=timezone.now().date())
    search = django_filters.CharFilter(field_name='description', lookup_expr='icontains')

    class Meta:
        model = Payment
        fields = ['task__title', 'method_name', 'is_refunded', 'date', 'category', 'search']

    def filter_refunded(self, queryset, name, value):
        if value:
            return queryset.filter(amount__lt=0)
        return queryset
