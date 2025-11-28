from django.db.models import Q, Sum, Count, Avg, F, Value, DecimalField
from django.db.models.functions import Coalesce
from Eapp.models import Task, User
from financials.models import  Payment
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone


class ReportGenerator:
    FIELD_MAPPING = {
        'task_id': 'title',
        'customer_name': 'customer__name',
        'laptop_model': 'laptop_model',
        'status': 'status',
        'date_in': 'date_in',
        'payment_status': 'payment_status',
        'urgency': 'urgency',
        'location': 'current_location',
        'brand': 'brand__name',
        'device_type': 'device_type',
        'total_cost': 'calculated_total_cost',
        'paid_amount': 'calculated_paid_amount',
        'outstanding_balance': 'outstanding_balance',
    }

    def __init__(self, config):
        self.config = config
        self.queryset = Task.objects.all()
        
    def generate_report(self):
        try:
            # Apply date filters
            self._apply_date_filters()
            
            # Apply field selections and build annotations
            fields = self.config.get('selectedFields', [])
            report_type = self.config.get('selectedType', 'operational')
            
            # Build the queryset data
            data = self._build_queryset_data(fields)
            
            return {
                'success': True,
                'data': data,
                'metadata': {
                    'generated_at': timezone.now().isoformat(),
                    'report_type': report_type
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'data': []
            }
    
    def _apply_date_filters(self):
        date_range = self.config.get('dateRange', 'last_30_days')
        custom_start = self.config.get('customStartDate')
        custom_end = self.config.get('customEndDate')
        
        now = timezone.now()
        
        if date_range == 'custom' and custom_start and custom_end:
            start_date = custom_start
            end_date = custom_end
        else:
            if date_range == 'last_7_days':
                start_date = now - timedelta(days=7)
            elif date_range == 'last_30_days':
                start_date = now - timedelta(days=30)
            elif date_range == 'last_3_months':
                start_date = now - timedelta(days=90)
            elif date_range == 'last_6_months':
                start_date = now - timedelta(days=180)
            elif date_range == 'last_year':
                start_date = now - timedelta(days=365)
            else:
                start_date = now - timedelta(days=30)  # default
            
            end_date = now
        
        # Apply date filter based on report type
        report_type = self.config.get('selectedType', 'operational')
        
        if report_type in ['financial', 'revenue']:
            # For financial reports, filter by payment date or task creation date
            self.queryset = self.queryset.filter(
                Q(created_at__date__range=(start_date, end_date)) |
                Q(payments__date__range=(start_date, end_date))
            ).distinct()
        else:
            # For operational reports, filter by task creation date
            self.queryset = self.queryset.filter(created_at__date__range=(start_date, end_date))
    
    def _build_queryset_data(self, fields):
        """Build report data based on selected fields"""
        
        # Annotate the queryset
        self.queryset = self.queryset.annotate(
            calculated_total_cost=Coalesce(
                F('estimated_cost'), Value(0, output_field=DecimalField())
            ) + Coalesce(
                Sum('cost_breakdowns__amount', filter=Q(cost_breakdowns__cost_type='Additive')),
                Value(0, output_field=DecimalField())
            ) - Coalesce(
                Sum('cost_breakdowns__amount', filter=Q(cost_breakdowns__cost_type='Subtractive')),
                Value(0, output_field=DecimalField())
            ),
            calculated_paid_amount=Coalesce(Sum('payments__amount'), Value(0, output_field=DecimalField()))
        ).annotate(
            outstanding_balance=F('calculated_total_cost') - F('calculated_paid_amount')
        )

        # Select related to optimize queries
        self.queryset = self.queryset.select_related(
            'assigned_to', 'customer', 'brand', 'workshop_location'
        )
        
        # Map selected fields to database fields and annotations
        db_fields = {field: self.FIELD_MAPPING[field] for field in fields if field in self.FIELD_MAPPING}
        
        # Use values() to fetch data directly from the database
        data = list(self.queryset.values(*db_fields.values()))

        # Rename the keys in the dictionaries to match the requested field names
        renamed_data = []
        for row in data:
            renamed_row = {}
            for field, db_field in db_fields.items():
                renamed_row[field] = row[db_field]
            renamed_data.append(renamed_row)
        
        return renamed_data

    
    def _calculate_turnaround_time(self, task):
        """Calculate turnaround time in days, excluding workshop time."""
        if not task.date_in:
            return "N/A"

        end_date = task.date_out.date() if task.date_out else timezone.now().date()
        total_duration = end_date - task.date_in

        workshop_duration = timedelta(days=0)
        if task.workshop_sent_at:
            workshop_end = task.workshop_returned_at.date() if task.workshop_returned_at else timezone.now().date()
            workshop_duration = workshop_end - task.workshop_sent_at.date()

        turnaround_duration = total_duration - workshop_duration
        days = turnaround_duration.days

        if task.status in ['Completed', 'Picked Up']:
            return f"{days} days"
        else:
            return f"{days} days (ongoing)"