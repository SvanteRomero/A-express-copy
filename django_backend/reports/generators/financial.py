# reports/generators/financial.py
"""Financial report generators."""
from django.db.models import Sum, Avg, Count, F, Q
from django.utils import timezone
from django.core.paginator import Paginator
from datetime import timedelta
from Eapp.models import Task
from financials.models import Payment
from common.encryption import decrypt_value
from .base import ReportGeneratorBase


class FinancialReportGenerator(ReportGeneratorBase):
    """Generates financial reports."""
    
    @staticmethod
    def generate_outstanding_payments(date_range='last_7_days', start_date=None, end_date=None, 
                                    page=1, page_size=10, search_query=None, pdf_export=False):
        """Generate outstanding payments report with date range, pagination, and search support."""
        # Apply date filter to tasks based on date_in field
        date_filter, actual_date_range, duration_days, duration_description, start_date, end_date = (
            ReportGeneratorBase.get_date_filter(date_range, start_date, end_date, field='date_in')
        )
        
        # Base query: Unpaid/Partially Paid AND Solved status AND Date Range
        base_query = (Q(payment_status="Unpaid") | Q(payment_status="Partially Paid")) & \
                     Q(workshop_status="Solved") & \
                     date_filter

        # Apply search filter if provided
        if search_query:
            search_filter = Q(title__icontains=search_query) | \
                          Q(customer__name__icontains=search_query)
            base_query &= search_filter

        # Get tasks with unpaid or partially paid status within date range
        outstanding_tasks_qs = (
            Task.objects.filter(base_query)
            .select_related("customer")
            .prefetch_related("payments", "customer__phone_numbers", "cost_breakdowns")
            .annotate(
                outstanding_balance_calculated=F('total_cost') - F('paid_amount')
            ).filter(outstanding_balance_calculated__gt=0).order_by('-outstanding_balance_calculated')
        )

        if pdf_export:
            # For PDF, we want Top 20 (Highest Balance) and "Last 20" (Lowest Balance)
            top_20_qs = outstanding_tasks_qs[:20]
            bottom_20_qs = outstanding_tasks_qs.reverse()[:20]
            
            def serialize_task(t):
                days_overdue = ((timezone.now().date() - t.date_in).days if t.date_in else 0)
                customer_phone = "Not provided"
                if hasattr(t.customer, "phone_numbers") and t.customer.phone_numbers.exists():
                    encrypted_phone = t.customer.phone_numbers.first().phone_number
                    customer_phone = decrypt_value(encrypted_phone) or encrypted_phone
                
                return {
                    "task_id": t.title,
                    "customer_name": t.customer.name,
                    "customer_phone": customer_phone,
                    "total_cost": float(t.total_cost or 0),
                    "paid_amount": float(t.paid_amount or 0),
                    "outstanding_balance": float(t.outstanding_balance_calculated),
                    "days_overdue": days_overdue,
                    "status": t.status,
                    "workshop_status": t.workshop_status,
                    "date_in": t.date_in.isoformat() if t.date_in else None,
                }

            pdf_data = {
                "top_20": [serialize_task(t) for t in top_20_qs],
                "bottom_20": [serialize_task(t) for t in bottom_20_qs]
            }
            
            total_outstanding = outstanding_tasks_qs.aggregate(total=Sum('outstanding_balance_calculated'))['total'] or 0
            count = outstanding_tasks_qs.count()
            
            return {
                "pdf_data": pdf_data,
                "summary": {
                    "total_outstanding": float(total_outstanding),
                    "task_count": count,
                    "average_balance": float(total_outstanding) / count if count > 0 else 0,
                },
                "date_range": actual_date_range,
                "duration_info": {
                    "days": duration_days,
                    "description": duration_description
                },
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            }

        paginator = Paginator(outstanding_tasks_qs, page_size)
        paginated_tasks = paginator.get_page(page)

        tasks_data = []
        for task in paginated_tasks:
            days_overdue = (
                (timezone.now().date() - task.date_in).days if task.date_in else 0
            )

            customer_phone = "Not provided"
            if (
                hasattr(task.customer, "phone_numbers")
                and task.customer.phone_numbers.exists()
            ):
                # Decrypt phone number before displaying
                encrypted_phone = task.customer.phone_numbers.first().phone_number
                customer_phone = decrypt_value(encrypted_phone) or encrypted_phone

            tasks_data.append({
                "task_id": task.title,
                "customer_name": task.customer.name,
                "customer_phone": customer_phone,
                "total_cost": float(task.total_cost or 0),
                "paid_amount": float(task.paid_amount or 0),
                "outstanding_balance": float(task.outstanding_balance_calculated),
                "days_overdue": days_overdue,
                "status": task.status,
                "workshop_status": task.workshop_status,
                "date_in": task.date_in.isoformat() if task.date_in else None,
            })

        total_outstanding = outstanding_tasks_qs.aggregate(total=Sum('outstanding_balance_calculated'))['total'] or 0

        return {
            "outstanding_tasks": tasks_data,
            "summary": {
                "total_outstanding": float(total_outstanding),
                "task_count": paginator.count,
                "average_balance": (
                    float(total_outstanding) / paginator.count if paginator.count > 0 else 0
                ),
            },
            "date_range": actual_date_range,
            "duration_info": {
                "days": duration_days,
                "description": duration_description
            },
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "pagination": {
                "current_page": paginated_tasks.number,
                "page_size": page_size,
                "total_tasks": paginator.count,
                "total_pages": paginator.num_pages,
                "has_next": paginated_tasks.has_next(),
                "has_previous": paginated_tasks.has_previous(),
            }
        }
    
    @staticmethod
    def generate_payment_methods(date_range='last_7_days', start_date=None, end_date=None):
        """Generate payment methods breakdown report."""
        date_filter, actual_date_range, duration_days, duration_description, start_date, end_date = (
            ReportGeneratorBase.get_date_filter(date_range, start_date, end_date)
        )

        # Revenue payments (positive amounts)
        revenue_methods = (
            Payment.objects.filter(date_filter, amount__gt=0)
            .values("method__name")
            .annotate(
                total_amount=Sum("amount"),
                payment_count=Count("id"),
                average_payment=Avg("amount"),
            )
            .order_by("-total_amount")
        )

        # Expenditure payments (negative amounts)
        expenditure_methods = (
            Payment.objects.filter(date_filter, amount__lt=0)
            .values("method__name")
            .annotate(
                total_amount=Sum("amount"),
                payment_count=Count("id"),
                average_payment=Avg("amount"),
            )
            .order_by("total_amount")
        )

        total_revenue = (
            Payment.objects.filter(date_filter, amount__gt=0).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )

        total_expenditure = abs(
            Payment.objects.filter(date_filter, amount__lt=0).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )

        # Process revenue methods
        revenue_data = []
        for method in revenue_methods:
            percentage = (
                (method["total_amount"] / total_revenue * 100)
                if total_revenue > 0
                else 0
            )
            revenue_data.append({
                "method_name": method["method__name"],
                "total_amount": float(method["total_amount"]),
                "payment_count": method["payment_count"],
                "average_payment": float(method["average_payment"]),
                "percentage": round(percentage, 1),
            })

        # Process expenditure methods
        expenditure_data = []
        for method in expenditure_methods:
            percentage = (
                (abs(method["total_amount"]) / total_expenditure * 100)
                if total_expenditure > 0
                else 0
            )
            expenditure_data.append({
                "method_name": method["method__name"],
                "total_amount": float(method["total_amount"]),
                "payment_count": method["payment_count"],
                "average_payment": float(method["average_payment"]),
                "percentage": round(percentage, 1),
            })

        return {
            "revenue_methods": revenue_data,
            "expenditure_methods": expenditure_data,
            "summary": {
                "total_revenue": float(total_revenue),
                "total_expenditure": float(total_expenditure),
                "net_revenue": float(total_revenue - total_expenditure),
                "total_payments": len(revenue_data) + len(expenditure_data),
            },
            "date_range": actual_date_range,
            "duration_info": {
                "days": duration_days,
                "description": duration_description
            },
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
        }
    
    @staticmethod
    def generate_revenue_overview():
        """
        Calculate revenue for this month and today, with comparisons to the previous period.
        """
        now = timezone.now()
        today = now.date()

        # Opening balance
        opening_balance = (
            Payment.objects.filter(date__lt=today).aggregate(total=Sum("amount"))["total"]
            or 0
        )

        # Today's revenue
        today_revenue = (
            Payment.objects.filter(date=today, amount__gt=0).aggregate(total=Sum("amount"))[
                "total"
            ]
            or 0
        )

        # Yesterday's revenue
        yesterday = today - timedelta(days=1)
        yesterday_revenue = (
            Payment.objects.filter(date=yesterday, amount__gt=0).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )

        # Today's expenditure
        today_expenditure = (
            Payment.objects.filter(date=today, amount__lt=0).aggregate(total=Sum("amount"))[
                "total"
            ]
            or 0
        )

        # Yesterday's expenditure
        yesterday_expenditure = (
            Payment.objects.filter(date=yesterday, amount__lt=0).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )

        # Percentage changes
        day_over_day_change = (
            ((today_revenue - yesterday_revenue) / yesterday_revenue * 100)
            if yesterday_revenue
            else 100
        )
        expenditure_day_over_day_change = (
            ((today_expenditure - yesterday_expenditure) / yesterday_expenditure * 100)
            if yesterday_expenditure
            else 100
        )

        return {
            "opening_balance": opening_balance,
            "today_revenue": today_revenue,
            "day_over_day_change": day_over_day_change,
            "today_expenditure": abs(today_expenditure),
            "expenditure_day_over_day_change": expenditure_day_over_day_change,
        }
