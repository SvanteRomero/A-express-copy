import django_filters
from .models import Task
from financials.models import Payment
from django.utils import timezone

class TaskFilter(django_filters.FilterSet):
    created_at = django_filters.DateFromToRangeFilter()
    updated_at = django_filters.DateFromToRangeFilter()
    status = django_filters.CharFilter(method='filter_status')

    activity_user = django_filters.NumberFilter(method='filter_activity_user')

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
