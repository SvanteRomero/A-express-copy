# reports/generators/base.py
"""Base utilities for report generation."""
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta, datetime, time


class ReportGeneratorBase:
    """Base class with shared report generation utilities."""
    
    @staticmethod
    def get_date_filter(date_range=None, start_date=None, end_date=None, field='date'):
        """
        Helper method to create date filters.
        
        Returns:
            tuple: (Q filter, actual_range, duration_days, duration_description, start_date, end_date)
        """
        today = timezone.now().date()
        actual_range = date_range or 'last_30_days'
        duration_days = 0
        duration_description = ""
        
        # Handle custom date range
        if start_date and end_date:
            try:
                # Parse string dates if provided
                if isinstance(start_date, str):
                    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                if isinstance(end_date, str):
                    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                
                # Calculate duration
                duration_days = (end_date - start_date).days
                if duration_days < 0:
                    # Swap if dates are reversed
                    start_date, end_date = end_date, start_date
                    duration_days = abs(duration_days)
                
                # Generate duration description
                if duration_days == 0:
                    duration_description = "1 day"
                elif duration_days < 7:
                    duration_description = f"{duration_days} days"
                elif duration_days < 30:
                    weeks = duration_days // 7
                    duration_description = f"{weeks} week{'s' if weeks > 1 else ''}"
                elif duration_days < 365:
                    months = duration_days // 30
                    duration_description = f"{months} month{'s' if months > 1 else ''}"
                else:
                    years = duration_days // 365
                    duration_description = f"{years} year{'s' if years > 1 else ''}"
                
                # For datetime fields, we need to include the full day
                start_datetime = datetime.combine(start_date, time.min)
                end_datetime = datetime.combine(end_date, time.max)
                
                # Make timezone-aware if needed
                if timezone.is_naive(start_datetime):
                    start_datetime = timezone.make_aware(start_datetime)
                if timezone.is_naive(end_datetime):
                    end_datetime = timezone.make_aware(end_datetime)
                
                filter_kwargs = {
                    f'{field}__gte': start_datetime,
                    f'{field}__lte': end_datetime
                }
                actual_range = "custom"
                return Q(**filter_kwargs), actual_range, duration_days, duration_description, start_date, end_date
                
            except (ValueError, TypeError) as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error parsing custom dates: {e}")
                # Fall back to default if custom dates are invalid
        
        # Handle predefined date ranges
        end_date = today  # Default end date for predefined ranges
        if date_range == 'last_7_days':
            start_date = today - timedelta(days=7)
            duration_days = 7
            duration_description = "7 days"
        elif date_range == 'last_30_days':
            start_date = today - timedelta(days=30)
            duration_days = 30
            duration_description = "30 days"
        elif date_range == 'last_3_months':
            start_date = today - timedelta(days=90)
            duration_days = 90
            duration_description = "3 months"
        elif date_range == 'last_6_months':
            start_date = today - timedelta(days=180)
            duration_days = 180
            duration_description = "6 months"
        elif date_range == 'last_year':
            start_date = today - timedelta(days=365)
            duration_days = 365
            duration_description = "1 year"
        else:
            # Default to last 30 days
            start_date = today - timedelta(days=30)
            actual_range = 'last_30_days'
            duration_days = 30
            duration_description = "30 days"
        
        # For datetime fields, start from beginning of the start date
        start_datetime = datetime.combine(start_date, time.min)
        if timezone.is_naive(start_datetime):
            start_datetime = timezone.make_aware(start_datetime)
        
        filter_kwargs = {f'{field}__gte': start_datetime, f'{field}__lte': datetime.combine(end_date, time.max)}
        return Q(**filter_kwargs), actual_range, duration_days, duration_description, start_date, end_date
