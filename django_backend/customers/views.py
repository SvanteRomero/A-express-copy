from django.db.models import Count, Exists, OuterRef
from rest_framework import viewsets, permissions, filters
from .models import Customer, Referrer
from .serializers import CustomerSerializer, ReferrerSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from Eapp.pagination import StandardResultsSetPagination
from Eapp.models import Task

class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'phone_numbers__phone_number']

    def get_queryset(self):
        debt_subquery = Task.objects.filter(customer=OuterRef('pk'), is_debt=True)
        return Customer.objects.annotate(
            tasks_count=Count('tasks'),
            has_debt=Exists(debt_subquery)
        ).prefetch_related('phone_numbers').order_by('name')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        credit_customers_count = self.get_queryset().filter(has_debt=True).count()
        data = {
            'credit_customers_count': credit_customers_count
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def monthly_acquisition(self, request):
        """
        Provides monthly customer acquisition data for the last 12 months.
        """
        from django.db.models.functions import TruncMonth
        from django.utils import timezone
        import calendar

        # Get the last 12 months
        today = timezone.now()
        months = [(today - timezone.timedelta(days=30 * i)).strftime('%Y-%m-01') for i in range(12)]
        months.reverse()

        # Query to get monthly customer counts
        acquisition_data = (
            Customer.objects
            .filter(created_at__gte=months[0])
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(customers=Count('id'))
            .order_by('month')
        )

        # Create a dictionary for quick lookup
        data_map = {item['month'].strftime('%b'): item['customers'] for item in acquisition_data}

        # Format the data for the chart
        chart_data = []
        for i in range(12):
            month_date = today - timezone.timedelta(days=30 * i)
            month_abbr = calendar.month_abbr[month_date.month]
            chart_data.append({
                'month': month_abbr,
                'customers': data_map.get(month_abbr, 0)
            })
        
        chart_data.reverse() # To have the current month at the end

        return Response(chart_data)

class ReferrerViewSet(viewsets.ModelViewSet):
    queryset = Referrer.objects.all()
    serializer_class = ReferrerSerializer
    permission_classes = [permissions.IsAuthenticated]