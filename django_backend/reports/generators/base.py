# reports/generators/base.py
"""Base utilities for report generation."""
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta, datetime, time


class ReportGeneratorBase:
    """Base class with shared report generation utilities."""
    
    @staticmethod
    def _parse_custom_dates(start_date, end_date):
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        duration_days = (end_date - start_date).days
        if duration_days < 0:
            start_date, end_date = end_date, start_date
            duration_days = abs(duration_days)
            
        return start_date, end_date, duration_days

    @staticmethod
    def _get_duration_description(duration_days):
        if duration_days == 0:
            return "1 day"
        if duration_days < 7:
            return f"{duration_days} days"
        if duration_days < 30:
            weeks = duration_days // 7
            return f"{weeks} week{'s' if weeks > 1 else ''}"
        if duration_days < 365:
            months = duration_days // 30
            return f"{months} month{'s' if months > 1 else ''}"
            
        years = duration_days // 365
        return f"{years} year{'s' if years > 1 else ''}"

    @staticmethod
    def _make_datetime_aware(dt):
        if timezone.is_naive(dt):
            return timezone.make_aware(dt)
        return dt

    @staticmethod
    def _get_predefined_date_range(date_range, today):
        ranges = {
            'last_7_days': (7, "7 days"),
            'last_30_days': (30, "30 days"),
            'last_3_months': (90, "3 months"),
            'last_6_months': (180, "6 months"),
            'last_year': (365, "1 year"),
        }
        
        if date_range in ranges:
            days, desc = ranges[date_range]
            return today - timedelta(days=days), days, desc
            
        return today - timedelta(days=30), 30, "30 days"

    @staticmethod
    def get_date_filter(date_range=None, start_date=None, end_date=None, field='date'):
        """
        Helper method to create date filters.
        
        Returns:
            tuple: (Q filter, actual_range, duration_days, duration_description, start_date, end_date)
        """
        today = timezone.now().date()
        actual_range = date_range or 'last_30_days'
        
        if start_date and end_date:
            try:
                start_date, end_date, duration_days = ReportGeneratorBase._parse_custom_dates(start_date, end_date)
                duration_description = ReportGeneratorBase._get_duration_description(duration_days)
                
                start_datetime = ReportGeneratorBase._make_datetime_aware(datetime.combine(start_date, time.min))
                end_datetime = ReportGeneratorBase._make_datetime_aware(datetime.combine(end_date, time.max))
                
                filter_kwargs = {
                    f'{field}__gte': start_datetime,
                    f'{field}__lte': end_datetime
                }
                return Q(**filter_kwargs), "custom", duration_days, duration_description, start_date, end_date
                
            except (ValueError, TypeError) as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error parsing custom dates: {e}")
                # Fall back to default if custom dates are invalid
        
        # Handle predefined date ranges
        start_date, duration_days, duration_description = ReportGeneratorBase._get_predefined_date_range(date_range, today)
        end_date = today
        if date_range not in ['last_7_days', 'last_30_days', 'last_3_months', 'last_6_months', 'last_year']:
            actual_range = 'last_30_days'
        
        start_datetime = ReportGeneratorBase._make_datetime_aware(datetime.combine(start_date, time.min))
        filter_kwargs = {f'{field}__gte': start_datetime, f'{field}__lte': datetime.combine(end_date, time.max)}
        return Q(**filter_kwargs), actual_range, duration_days, duration_description, start_date, end_date

    @staticmethod
    def _calculate_period_hours(periods, completed_at, start_field, end_field):
        total_hours = 0
        if not periods:
            return total_hours
            
        for period in periods:
            if not period.get(start_field):
                continue
                
            start_time = datetime.fromisoformat(period[start_field])
            start_time = ReportGeneratorBase._make_datetime_aware(start_time)
            
            if period.get(end_field):
                end_time = datetime.fromisoformat(period[end_field])
                end_time = ReportGeneratorBase._make_datetime_aware(end_time)
            else:
                end_time = completed_at
                
            duration = end_time - start_time
            total_hours += duration.total_seconds() / 3600
            
        return total_hours

    @staticmethod
    def calculate_net_execution_hours(task):
        """
        Calculate net execution hours for a task.
        
        Net execution time = (completed_at - first_assigned_at) - return_periods - workshop_periods
        
        Args:
            task: Task object with first_assigned_at, completed_at, return_periods, workshop_periods
            
        Returns:
            float: Net execution hours (0 if task not completed or not assigned)
        """
        if not task.first_assigned_at or not task.completed_at:
            return 0
        
        # Calculate gross hours
        gross_duration = task.completed_at - task.first_assigned_at
        gross_hours = gross_duration.total_seconds() / 3600
        
        # Calculate return and workshop hours
        total_return_hours = ReportGeneratorBase._calculate_period_hours(
            task.return_periods, task.completed_at, 'returned_at', 'reassigned_at'
        )
        total_workshop_hours = ReportGeneratorBase._calculate_period_hours(
            task.workshop_periods, task.completed_at, 'sent_at', 'returned_at'
        )
        
        # Return net hours (never negative)
        return max(0, gross_hours - total_return_hours - total_workshop_hours)
