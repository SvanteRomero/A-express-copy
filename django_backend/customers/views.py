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
        """
        Returns customer statistics including:
        - credit_customers_count: Number of customers with outstanding debt
        - monthly_acquisition: Customer acquisition data for the last 12 months (for charts)
        """
        from django.utils import timezone
        from collections import Counter
        import calendar
        import datetime

        # 1. Credit customers count
        credit_customers_count = self.get_queryset().filter(has_debt=True).count()

        # 2. Monthly acquisition data for the last 12 months
        today = timezone.now()
        
        # Calculate start date (12 months ago, first of that month)
        start_date = (today - datetime.timedelta(days=365)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Fetch customers created in the last 12 months (simple filter, no TruncMonth)
        customers_in_range = Customer.objects.filter(
            created_at__gte=start_date
        ).values_list('created_at', flat=True)

        # Group by month in Python (avoids SQLite timezone issues)
        month_counts = Counter()
        for created_at in customers_in_range:
            if created_at:
                month_key = calendar.month_abbr[created_at.month]
                month_counts[month_key] += 1

        # Build the chart data for the last 12 months
        monthly_acquisition = []
        for i in range(11, -1, -1):  # Go from 11 months ago to current month
            month_date = today - datetime.timedelta(days=30 * i)
            month_abbr = calendar.month_abbr[month_date.month]
            monthly_acquisition.append({
                'month': month_abbr,
                'customers': month_counts.get(month_abbr, 0)
            })

        data = {
            'credit_customers_count': credit_customers_count,
            'monthly_acquisition': monthly_acquisition
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def for_messaging(self, request):
        """
        Return customers who have tasks matching the template filter.
        Groups tasks by customer for the messaging compose view.
        
        Query params:
        - template_filter: ready_for_pickup, repair_in_progress, debt_reminder
        - search: search by customer name or phone
        - page: pagination
        """
        from django.db.models import Q, Prefetch
        from Eapp.models import Task
        
        template_filter = request.query_params.get('template_filter', '')
        search = request.query_params.get('search', '')
        
        # Build task filter based on template
        task_filter = Q()
        include_all_tasks = False  # For broadcast mode
        
        if template_filter == 'ready_for_pickup':
            task_filter = Q(status='Ready for Pickup')
        elif template_filter == 'repair_in_progress':
            finished_statuses = ['Ready for Pickup', 'Picked Up', 'Completed', 'Terminated', 'Cancelled']
            task_filter = ~Q(status__in=finished_statuses)
        elif template_filter == 'debt_reminder':
            task_filter = Q(is_debt=True, status='Picked Up')
        elif template_filter == 'broadcast':
            # Broadcast mode: return all customers with any tasks (for general messages)
            # We'll include their most recent task for context
            include_all_tasks = True
        else:
            # No filter - return empty (require template selection)
            return Response({'results': [], 'count': 0})
        
        if include_all_tasks:
            # Broadcast mode: get all customers with tasks, include only most recent task
            from django.db.models import Max
            
            # Get all customers who have at least one task
            queryset = Customer.objects.filter(
                tasks__isnull=False
            ).distinct().prefetch_related(
                'phone_numbers',
            ).order_by('name')
            
            # For each customer, we'll fetch their most recent task in serialization
        else:
            # Status-filtered mode
            filtered_tasks = Task.objects.filter(task_filter).select_related(
                'laptop_model'
            ).order_by('-created_at')
            
            # Get customers who have at least one matching task
            customer_ids = filtered_tasks.values_list('customer_id', flat=True).distinct()
            
            # Build customer queryset with prefetched filtered tasks
            queryset = Customer.objects.filter(
                id__in=customer_ids
            ).prefetch_related(
                'phone_numbers',
                Prefetch(
                    'tasks',
                    queryset=filtered_tasks,
                    to_attr='filtered_tasks'
                )
            ).order_by('name')
        
        # Apply search filter
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(phone_numbers__phone_number__icontains=search)
            ).distinct()
        
        # Paginate
        page = self.paginate_queryset(queryset)
        if page is not None:
            data = self._serialize_customers_with_tasks(page, include_all_tasks)
            return self.get_paginated_response(data)
        
        data = self._serialize_customers_with_tasks(queryset, include_all_tasks)
        return Response({'results': data, 'count': len(data)})
    
    def _serialize_customers_with_tasks(self, customers, broadcast_mode=False):
        """Serialize customers with their filtered tasks for messaging."""
        from common.encryption import decrypt_value
        from Eapp.models import Task
        
        result = []
        for customer in customers:
            phone_numbers = []
            for pn in customer.phone_numbers.all():
                decrypted = decrypt_value(pn.phone_number) if pn.phone_number else ''
                if decrypted:
                    phone_numbers.append(decrypted)
            
            # Get tasks: either pre-filtered or fetch most recent for broadcast
            if broadcast_mode:
                # Broadcast mode: get just the most recent task for context
                customer_tasks = Task.objects.filter(
                    customer=customer
                ).select_related('laptop_model').order_by('-created_at')[:1]
            else:
                customer_tasks = getattr(customer, 'filtered_tasks', [])
            
            tasks = []
            for task in customer_tasks:
                device_name = ''
                if task.laptop_model:
                    device_name = task.laptop_model.name
                if task.brand:
                    device_name = f"{task.brand} {device_name}".strip()
                
                # Use total_cost field directly (not the annotated calculated_total_cost)
                total_cost = float(task.total_cost or 0)
                outstanding = total_cost - float(task.paid_amount or 0)
                
                tasks.append({
                    'id': task.id,
                    'taskId': task.id,
                    'taskDisplayId': task.title,
                    'device': device_name or 'Unknown Device',
                    'description': task.description or '',
                    'deviceNotes': task.device_notes or '',
                    'status': task.status,
                    'workshopStatus': task.workshop_status,
                    'amount': str(total_cost),
                    'outstandingBalance': str(outstanding),
                    'isDebt': task.is_debt and outstanding > 0,
                    'createdAt': task.created_at.isoformat() if task.created_at else None,
                })
            
            # For broadcast mode, include customer even without tasks context
            # For filtered mode, only include if has matching tasks
            if tasks or broadcast_mode:
                result.append({
                    'customerId': customer.id,
                    'name': customer.name,
                    'phoneNumbers': phone_numbers,
                    'tasks': tasks,
                })
        
        return result

class ReferrerViewSet(viewsets.ModelViewSet):
    queryset = Referrer.objects.all()
    serializer_class = ReferrerSerializer
    permission_classes = [permissions.IsAuthenticated]