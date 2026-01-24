# Eapp/reports/predefined_reports.py
from django.db.models import Count, Sum, Avg, Q, F, DecimalField, Value
from django.utils import timezone
from datetime import timedelta, datetime, time
from django.db.models.functions import Coalesce
from Eapp.models import Task, User, TaskActivity
from financials.models import Payment
from django.core.paginator import Paginator
from common.encryption import decrypt_value


class PredefinedReportGenerator:
    # NOTE: The revenue summary generator has been removed.
    # If you need to restore revenue reporting, reintroduce a generator here.

    @staticmethod
    def _get_date_filter(date_range=None, start_date=None, end_date=None, field='date'):
        """Helper method to create date filters - returns filter, actual range, duration info, and start/end dates"""
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
        end_date = today # Default end date for predefined ranges
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
    
    @staticmethod
    def generate_outstanding_payments_report(date_range='last_7_days', start_date=None, end_date=None, page=1, page_size=10):
        """Generate outstanding payments report with date range and pagination support"""
        from django.core.paginator import Paginator
        # Apply date filter to tasks based on date_in field
        date_filter, actual_date_range, duration_days, duration_description, start_date, end_date = PredefinedReportGenerator._get_date_filter(date_range, start_date, end_date, field='date_in')
        
        # Get tasks with unpaid or partially paid status within date range
        # Use existing total_cost and paid_amount fields from the model
        outstanding_tasks_qs = (
            Task.objects.filter(
                (Q(payment_status="Unpaid") | Q(payment_status="Partially Paid")) &
                date_filter
            )
            .select_related("customer")
            .prefetch_related("payments", "customer__phone_numbers", "cost_breakdowns")
            .annotate(
                outstanding_balance_calculated=F('total_cost') - F('paid_amount')
            ).filter(outstanding_balance_calculated__gt=0).order_by('-outstanding_balance_calculated')
        )

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

            tasks_data.append(
                {
                    "task_id": task.title,
                    "customer_name": task.customer.name,
                    "customer_phone": customer_phone,
                    "total_cost": float(task.total_cost or 0),
                    "paid_amount": float(task.paid_amount or 0),
                    "outstanding_balance": float(task.outstanding_balance_calculated),
                    "days_overdue": days_overdue,
                    "status": task.status,
                    "date_in": task.date_in.isoformat() if task.date_in else None,
                }
            )

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
    def generate_technician_performance_report(date_range='last_7_days', start_date=None, end_date=None):
        """Generate comprehensive technician performance report with task status grouping."""
        date_filter_q, actual_date_range, duration_days, duration_description, start_date, end_date = PredefinedReportGenerator._get_date_filter(
            date_range, field="timestamp", start_date=start_date, end_date=end_date
        )

        technicians = User.objects.filter(role="Technician", is_active=True)
        if not technicians.exists():
            return { "technician_performance": [], "date_range": actual_date_range, "duration_info": { "days": duration_days, "description": duration_description }, "total_technicians": 0 }

        technician_ids = [t.id for t in technicians]
        
        # Bulk fetch tasks and activities
        tasks = Task.objects.filter(assigned_to_id__in=technician_ids).select_related('customer', 'laptop_model')
        activities = TaskActivity.objects.filter(user_id__in=technician_ids, timestamp__gte=date_filter_q.children[0][1], timestamp__lte=date_filter_q.children[1][1] if len(date_filter_q.children) > 1 else timezone.now())

        # Group data in memory
        tasks_by_tech = {tech_id: [] for tech_id in technician_ids}
        for task in tasks:
            tasks_by_tech[task.assigned_to_id].append(task)

        activities_by_tech = {tech_id: [] for tech_id in technician_ids}
        for activity in activities:
            activities_by_tech[activity.user_id].append(activity)

        total_tasks_in_period = TaskActivity.objects.filter(date_filter_q).values('task').distinct().count()

        final_report = []
        for tech in technicians:
            tech_tasks = tasks_by_tech[tech.id]
            tech_activities = activities_by_tech[tech.id]

            tasks_by_status = {}
            for task in tech_tasks:
                status = task.status
                if status not in tasks_by_status:
                    tasks_by_status[status] = []
                tasks_by_status[status].append({
                    "task_id": task.id, "task_title": task.title, "customer_name": task.customer.name if task.customer else "N/A",
                    "laptop_model": task.laptop_model.name if task.laptop_model else "N/A", "date_in": task.date_in.isoformat() if task.date_in else "N/A",
                    "estimated_cost": float(task.estimated_cost) if task.estimated_cost else 0,
                    "total_cost": float(task.total_cost) if task.total_cost else 0, "paid_amount": float(task.paid_amount) if task.paid_amount else 0,
                })
            
            completed_tasks_count = len({a.task_id for a in tech_activities if a.type == TaskActivity.ActivityType.STATUS_UPDATE})
            tasks_sent_to_workshop = len({a.task_id for a in tech_activities if a.type == TaskActivity.ActivityType.WORKSHOP})
            total_tasks_assigned = len({a.task_id for a in tech_activities if a.type == TaskActivity.ActivityType.ASSIGNMENT})

            workshop_rate = (tasks_sent_to_workshop / total_tasks_assigned * 100) if total_tasks_assigned > 0 else 0
            
            current_task_count = len([t for t in tech_tasks if t.status not in ["Completed", "Picked Up", "Terminated"]])
            
            tasks_involved_count = len({a.task_id for a in tech_activities if a.type in [TaskActivity.ActivityType.WORKSHOP, TaskActivity.ActivityType.NOTE, TaskActivity.ActivityType.STATUS_UPDATE, TaskActivity.ActivityType.DIAGNOSIS]})
            percentage_of_tasks_involved = (tasks_involved_count / total_tasks_in_period * 100) if total_tasks_in_period > 0 else 0

            final_report.append({
                "technician_id": tech.id, "technician_name": tech.get_full_name(), "technician_email": tech.email,
                "completed_tasks_count": completed_tasks_count,
                "current_in_progress_tasks": len(tasks_by_status.get("In Progress", [])),
                "current_assigned_tasks": current_task_count,
                "tasks_sent_to_workshop": tasks_sent_to_workshop,
                "workshop_rate": round(workshop_rate, 2),
                "percentage_of_tasks_involved": round(percentage_of_tasks_involved, 2),
                "tasks_by_status": tasks_by_status,
                "status_counts": {status: len(task_list) for status, task_list in tasks_by_status.items()},
                "total_tasks_handled": total_tasks_assigned,
            })

        final_report.sort(key=lambda x: x["completed_tasks_count"], reverse=True)

        return {
            "technician_performance": final_report,
            "date_range": actual_date_range,
            "duration_info": { "days": duration_days, "description": duration_description },
            'start_date': start_date.isoformat() if start_date else None,
            'end_date': end_date.isoformat() if end_date else None,
            "total_technicians": len(final_report),
            "summary": {
                "total_completed_tasks": sum(tech["completed_tasks_count"] for tech in final_report),
                "total_current_tasks": sum(tech["current_assigned_tasks"] for tech in final_report),
                "total_tasks_in_period": total_tasks_in_period,
            },
        }

    @staticmethod
    def generate_payment_methods_report(date_range='last_7_days', start_date=None, end_date=None):
        """Generate payment methods breakdown report"""
        date_filter, actual_date_range, duration_days, duration_description, start_date, end_date = PredefinedReportGenerator._get_date_filter(date_range, start_date, end_date)

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
        )  # Order by ascending (most negative first)

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
            revenue_data.append(
                {
                    "method_name": method["method__name"],
                    "total_amount": float(method["total_amount"]),
                    "payment_count": method["payment_count"],
                    "average_payment": float(method["average_payment"]),
                    "percentage": round(percentage, 1),
                }
            )

        # Process expenditure methods
        expenditure_data = []
        for method in expenditure_methods:
            percentage = (
                (abs(method["total_amount"]) / total_expenditure * 100)
                if total_expenditure > 0
                else 0
            )
            expenditure_data.append(
                {
                    "method_name": method["method__name"],
                    "total_amount": float(
                        method["total_amount"]
                    ),  # This will be negative
                    "payment_count": method["payment_count"],
                    "average_payment": float(method["average_payment"]),
                    "percentage": round(percentage, 1),
                }
            )

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
    def generate_task_status_report(date_range='last_7_days', start_date=None, end_date=None):
        """Generate task status overview report with date range support"""
        # Apply date filter to tasks based on date_in field
        date_filter, actual_date_range, duration_days, duration_description, start_date, end_date = PredefinedReportGenerator._get_date_filter(date_range, start_date, end_date, field='date_in')
        
        # Filter tasks by date range
        filtered_tasks = Task.objects.filter(date_filter)
        
        status_counts = (
            filtered_tasks.values("status").annotate(count=Count("id")).order_by("-count")
        )

        total_tasks = filtered_tasks.count()

        # Calculate percentages
        status_data = []
        for item in status_counts:
            percentage = (item["count"] / total_tasks * 100) if total_tasks > 0 else 0
            status_data.append(
                {
                    "status": item["status"],
                    "count": item["count"],
                    "percentage": round(percentage, 1),
                }
            )

        # Urgency distribution
        urgency_counts = filtered_tasks.values("urgency").annotate(count=Count("id"))

        # Most popular brand and model
        popular_brand = filtered_tasks.values('brand__name').annotate(brand_count=Count('brand')).order_by('-brand_count').first()
        popular_model = filtered_tasks.values('laptop_model__name').annotate(model_count=Count('laptop_model')).order_by('-model_count').first()

        # Top 5 brands and models
        top_brands = list(filtered_tasks.values('brand__name').annotate(count=Count('brand')).order_by('-count').filter(brand__name__isnull=False)[:5])
        top_models_query = list(filtered_tasks.values('laptop_model__name').annotate(count=Count('laptop_model')).order_by('-count').filter(laptop_model__name__isnull=False)[:5])
        top_models = [{'laptop_model': item['laptop_model__name'], 'count': item['count']} for item in top_models_query]

        return {
            "status_distribution": status_data,
            "urgency_distribution": list(urgency_counts),
            "total_tasks": total_tasks,
            "popular_brand": popular_brand['brand__name'] if popular_brand and popular_brand['brand__name'] else "N/A",
            "popular_model": popular_model['laptop_model__name'] if popular_model and popular_model['laptop_model__name'] else "N/A",
            "top_brands": top_brands,
            "top_models": top_models,
            "generated_at": timezone.now(),
            "date_range": actual_date_range,
            "duration_info": {
                "days": duration_days,
                "description": duration_description
            },
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
        }

    @staticmethod
    def generate_task_execution_report(period_type=None, date_range='last_7_days', start_date=None, end_date=None, page=1, page_size=10):
        """Generate task execution report based on assignment to completion time."""
        from datetime import datetime
        import pytz

        # Apply date filter based on COMPLETED_AT field
        date_filter, actual_date_range, duration_days, duration_description, start_date, end_date = PredefinedReportGenerator._get_date_filter(date_range, start_date, end_date, field='completed_at')
        
        # Query tasks with both assignment and completion times
        tasks = (
            Task.objects.filter(
                date_filter,
                first_assigned_at__isnull=False,
                completed_at__isnull=False,
            )
            .select_related('customer')
            # No need to prefetch activities anymore as we have denormalized fields!
            .order_by('-completed_at')
        )
        
        if not tasks.exists():
            return {
                "periods": [],
                "task_details": [],
                "summary": {
                    "overall_average_hours": 0,
                    "fastest_task_hours": 0,
                    "slowest_task_hours": 0,
                    "total_tasks_analyzed": 0,
                    "total_returns": 0,
                    "tasks_with_returns": 0,
                },
                "date_range": actual_date_range,
                "duration_info": {
                    "days": duration_days,
                    "description": duration_description
                },
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            }
        
        # Determine period type automatically if not specified
        if not period_type or period_type == 'auto':
            if duration_days <= 7:
                period_type = 'daily'
            elif duration_days <= 30:
                period_type = 'weekly'
            elif duration_days <= 90:
                period_type = 'monthly'
            else:
                period_type = 'quarterly'

        grouped_tasks = {}
        task_details = []
        utc_plus_3 = pytz.timezone('Etc/GMT-3')
        
        for task in tasks:
            # Calculate execution time in hours (Net Execution Time)
            gross_duration = task.completed_at - task.first_assigned_at
            gross_hours = gross_duration.total_seconds() / 3600
            
            total_return_hours = 0
            if task.return_periods:
                for period in task.return_periods:
                    if period.get('returned_at'):
                        returned_at = datetime.fromisoformat(period['returned_at'])
                        if timezone.is_naive(returned_at):
                            returned_at = timezone.make_aware(returned_at)
                            
                        if period.get('reassigned_at'):
                            reassigned_at = datetime.fromisoformat(period['reassigned_at'])
                            if timezone.is_naive(reassigned_at):
                                reassigned_at = timezone.make_aware(reassigned_at)
                        else:
                            # If not reassigned yet but completed (edge case), cap at completion
                            reassigned_at = task.completed_at
                            
                        return_duration = reassigned_at - returned_at
                        total_return_hours += return_duration.total_seconds() / 3600

            # Subtract workshop periods (Option A implementation)
            total_workshop_hours = 0
            if task.workshop_periods:
                for period in task.workshop_periods:
                    if period.get('sent_at'):
                        sent_at = datetime.fromisoformat(period['sent_at'])
                        if timezone.is_naive(sent_at):
                            sent_at = timezone.make_aware(sent_at)
                            
                        if period.get('returned_at'):
                            returned_at = datetime.fromisoformat(period['returned_at'])
                            if timezone.is_naive(returned_at):
                                returned_at = timezone.make_aware(returned_at)
                        else:
                            # If still at workshop logic or just not returned yet, use completed_at limit
                            returned_at = task.completed_at
                            
                        workshop_duration = returned_at - sent_at
                        total_workshop_hours += workshop_duration.total_seconds() / 3600
            
            net_hours = max(0, gross_hours - total_return_hours - total_workshop_hours)
            
            # Group by period
            local_completion = task.completed_at.astimezone(utc_plus_3)
            
            if period_type == "daily":
                period_key = local_completion.strftime("%Y-%m-%d")
            elif period_type == "weekly":
                period_key = local_completion.strftime("%Y-W%U")
            elif period_type == "monthly":
                period_key = local_completion.strftime("%Y-%m")
            elif period_type == "quarterly":
                quarter = (local_completion.month - 1) // 3 + 1
                period_key = f"{local_completion.year}-Q{quarter}"
            else:
                period_key = "overall"
            
            if period_key not in grouped_tasks:
                grouped_tasks[period_key] = []
            grouped_tasks[period_key].append(net_hours)
            
            # Format technicians list
            technicians_str = "Unassigned"
            if task.execution_technicians:
                # Extract names and join
                tech_names = [t.get('name', 'Unknown') for t in task.execution_technicians]
                technicians_str = ", ".join(tech_names)
            
            # Format display times
            local_start = task.first_assigned_at.astimezone(utc_plus_3)
            local_end = task.completed_at.astimezone(utc_plus_3)
            
            # Build task detail
            task_details.append({
                "title": task.title,
                "customer_name": task.customer.name if task.customer else "N/A",
                "execution_start": local_start.strftime("%Y-%m-%d %I:%M %p"),
                "execution_end": local_end.strftime("%Y-%m-%d %I:%M %p"),
                "technicians": technicians_str,
                "technician_count": len(task.execution_technicians),
                "execution_hours": round(net_hours, 1),
                "return_count": task.return_count,
            })
        
        # Calculate period statistics
        periods_data = []
        all_execution_hours = []
        
        for period, hours_list in grouped_tasks.items():
            avg_hours = sum(hours_list) / len(hours_list) if hours_list else 0
            periods_data.append({
                "period": period,
                "average_execution_hours": round(avg_hours, 1),
                "tasks_completed": len(hours_list),
            })
            all_execution_hours.extend(hours_list)
        
        periods_data.sort(key=lambda x: x["period"])
        
        # Sort by execution time (slowest first)
        task_details.sort(key=lambda x: x["execution_hours"], reverse=True)
        
        # Paginate
        paginator = Paginator(task_details, page_size)
        paginated_tasks = paginator.get_page(page)
        
        # Calculate summary
        overall_avg = sum(all_execution_hours) / len(all_execution_hours) if all_execution_hours else 0
        total_returns = sum(t["return_count"] for t in task_details)
        tasks_with_returns = sum(1 for t in task_details if t["return_count"] > 0)
        
        # Calculate best period (fastest average execution)
        best_period = None
        if periods_data:
            # Sort by average execution hours (asc)
            sorted_by_speed = sorted(periods_data, key=lambda x: x["average_execution_hours"])
            best_period = sorted_by_speed[0]["period"]

        return {
            "periods": periods_data,
            "task_details": list(paginated_tasks),
            "summary": {
                "overall_average_hours": round(overall_avg, 1),
                "fastest_task_hours": round(min(all_execution_hours), 1) if all_execution_hours else 0,
                "slowest_task_hours": round(max(all_execution_hours), 1) if all_execution_hours else 0,
                "best_period": best_period,
                "total_tasks_analyzed": len(task_details),
                "total_returns": total_returns,
                "tasks_with_returns": tasks_with_returns,
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
    def generate_revenue_overview_report():
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

    @staticmethod
    def generate_technician_workload_report(date_range='last_7_days', start_date=None, end_date=None):
        """Generate technician workload report with date range support"""
        # Apply date filter to tasks based on date_in field
        date_filter, actual_date_range, duration_days, duration_description, start_date, end_date = PredefinedReportGenerator._get_date_filter(date_range, start_date, end_date, field='date_in')
        
        workload_data = (
            User.objects.filter(role="Technician", is_active=True)
            .annotate(
                total_tasks=Count(
                    "tasks", 
                    filter=~Q(tasks__status__in=["Completed", "Picked Up"]) & date_filter
                ),
                in_progress_tasks=Count(
                    "tasks", 
                    filter=Q(tasks__status="In Progress") & date_filter
                ),
                awaiting_parts_tasks=Count(
                    "tasks", 
                    filter=Q(tasks__status="Awaiting Parts") & date_filter
                ),
                pending_tasks=Count(
                    "tasks", 
                    filter=Q(tasks__status="Pending") & date_filter
                ),
            )
            .values(
                "id",
                "first_name",
                "last_name",
                "total_tasks",
                "in_progress_tasks",
                "awaiting_parts_tasks",
                "pending_tasks",
            )
            .order_by("-total_tasks")
        )

        workload_list = []
        for tech in workload_data:
            workload_list.append(
                {
                    "name": f"{tech['first_name']} {tech['last_name']}",
                    "tasks": tech["total_tasks"],
                    "in_progress": tech["in_progress_tasks"],
                    "awaiting_parts": tech["awaiting_parts_tasks"],
                    "pending": tech["pending_tasks"],
                }
            )

        return {
            "workload_data": workload_list,
            "total_active_technicians": len(workload_list),
            "total_assigned_tasks": sum(tech["tasks"] for tech in workload_list),
            "date_range": actual_date_range,
            "duration_info": {
                "days": duration_days,
                "description": duration_description
            },
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
        }

    @staticmethod
    def generate_front_desk_performance_report(date_range='last_30_days', start_date=None, end_date=None):
        """Generate front desk performance report with custom date range support"""
        date_filter, actual_date_range, duration_days, duration_description, start_date, end_date = PredefinedReportGenerator._get_date_filter(
            date_range, start_date, end_date, field='timestamp'
        )

        front_desk_users = User.objects.filter(role="Front Desk")
        
        approved_activities = TaskActivity.objects.filter(
            date_filter,
            type=TaskActivity.ActivityType.READY,
            user__in=front_desk_users
        ).values('user__id', 'user__first_name', 'user__last_name').annotate(count=Count('id'))

        sent_out_activities = TaskActivity.objects.filter(
            date_filter,
            type=TaskActivity.ActivityType.PICKED_UP,
            user__in=front_desk_users
        ).values('user__id', 'user__first_name', 'user__last_name').annotate(count=Count('id'))

        total_approved = sum(item['count'] for item in approved_activities)
        total_sent_out = sum(item['count'] for item in sent_out_activities)

        performance_data = {}

        for activity in approved_activities:
            user_id = activity['user__id']
            if user_id not in performance_data:
                performance_data[user_id] = {
                    "user_name": f"{activity['user__first_name']} {activity['user__last_name']}",
                    "approved_count": 0,
                    "sent_out_count": 0
                }
            performance_data[user_id]['approved_count'] = activity['count']

        for activity in sent_out_activities:
            user_id = activity['user__id']
            if user_id not in performance_data:
                performance_data[user_id] = {
                    "user_name": f"{activity['user__first_name']} {activity['user__last_name']}",
                    "approved_count": 0,
                    "sent_out_count": 0
                }
            performance_data[user_id]['sent_out_count'] = activity['count']
            
        for user_id, data in performance_data.items():
            data['approved_percentage'] = (data['approved_count'] / total_approved * 100) if total_approved > 0 else 0
            data['sent_out_percentage'] = (data['sent_out_count'] / total_sent_out * 100) if total_sent_out > 0 else 0
        
        report_data = {
            "performance": list(performance_data.values()),
            "summary": {
                "total_approved": total_approved,
                "total_sent_out": total_sent_out,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            }
        }
        return report_data