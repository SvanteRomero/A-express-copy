# Eapp/reports/predefined_reports.py
from itertools import zip_longest
from django.db.models import Count, Sum, Avg, Q, F
from django.utils import timezone
from datetime import timedelta, datetime, time
from decimal import Decimal
from Eapp.models import Task, User, TaskActivity
from financials.models import Payment, CostBreakdown


class PredefinedReportGenerator:


    @staticmethod
    def generate_revenue_summary_report(date_range="last_7_days", start_date=None, end_date=None):
        """Generate an accurate financial revenue summary report"""
        date_filter, actual_date_range, duration_days, duration_description = PredefinedReportGenerator._get_date_filter(date_range, start_date, end_date)

        # FILTER: Only positive amounts = actual revenue
        revenue_filter = Q(date_filter) & Q(amount__gt=0)

        # Optional: Capture refunds separately (negative amounts)
        refund_filter = Q(date_filter) & Q(amount__lt=0)

        # --- 1. Daily Revenue (only income) ---
        payments = (
            Payment.objects.filter(revenue_filter)
            .values("date")
            .annotate(daily_revenue=Sum("amount"))
            .order_by("date")
        )

        # --- 2. Monthly Totals (Revenue-focused) ---
        monthly_revenue = Payment.objects.filter(revenue_filter).aggregate(
            total_revenue=Sum("amount"),
            average_payment=Avg("amount"),
            payment_count=Count("id"),
        )

        # --- 3. Refund Summary (for transparency) ---
        refund_summary = Payment.objects.filter(refund_filter).aggregate(
            total_refunds=Sum("amount"),  # This will be negative
            refund_count=Count("id"),
        )
        total_refunds = abs(refund_summary["total_refunds"] or 0)
        net_revenue = (monthly_revenue["total_revenue"] or 0) - total_refunds

        # --- 4. Payment Methods (only for revenue, not refunds) ---
        payment_methods = (
            Payment.objects.filter(revenue_filter)
            .values("method__name")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )

        return {
            "payments_by_date": list(payments),
            "monthly_totals": {
                "total_revenue": monthly_revenue["total_revenue"] or 0,
                "total_refunds": total_refunds,
                "net_revenue": net_revenue,
                "average_payment": monthly_revenue["average_payment"] or 0,
                "payment_count": monthly_revenue["payment_count"] or 0,
                "refund_count": refund_summary["refund_count"] or 0,
            },
            "payment_methods": list(payment_methods),
            "date_range": actual_date_range,
            "duration_info": {
                "days": duration_days,
                "description": duration_description
            },
            "start_date": start_date,
            "end_date": end_date,
        }

 
        
    @staticmethod
    def _get_date_filter(date_range=None, start_date=None, end_date=None, field='date'):
        """Helper method to create date filters - returns filter, actual range, and duration info"""
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
                return Q(**filter_kwargs), actual_range, duration_days, duration_description
                
            except (ValueError, TypeError) as e:
                print(f"Error parsing custom dates: {e}")
                # Fall back to default if custom dates are invalid
        
        # Handle predefined date ranges
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
        
        filter_kwargs = {f'{field}__gte': start_datetime}
        return Q(**filter_kwargs), actual_range, duration_days, duration_description
    
    @staticmethod
    def generate_outstanding_payments_report(date_range='last_7_days', start_date=None, end_date=None):
        """Generate outstanding payments report with date range support"""
        # Apply date filter to tasks based on date_in field
        date_filter, actual_date_range, duration_days, duration_description = PredefinedReportGenerator._get_date_filter(date_range, start_date, end_date, field='date_in')
        
        # Get tasks with unpaid or partially paid status within date range
        outstanding_tasks = (
            Task.objects.filter(
                (Q(payment_status="Unpaid") | Q(payment_status="Partially Paid")) &
                date_filter
            )
            .select_related("customer")
            .prefetch_related("payments", "customer__phone_numbers")
        )

        tasks_data = []
        for task in outstanding_tasks:
            # Calculate paid amount from related payments
            paid_amount = task.payments.aggregate(total=Sum("amount"))[
                "total"
            ] or Decimal("0.00")

            # Calculate total cost (estimated_cost + additive costs - subtractive costs)
            estimated_cost = task.estimated_cost or Decimal("0.00")
            additive_costs = task.cost_breakdowns.filter(
                cost_type="Additive"
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
            subtractive_costs = task.cost_breakdowns.filter(
                cost_type="Subtractive"
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

            total_cost = estimated_cost + additive_costs - subtractive_costs
            outstanding_balance = total_cost - paid_amount

            # Only include tasks with positive outstanding balance
            if outstanding_balance > 0:
                days_overdue = (
                    (timezone.now().date() - task.date_in).days if task.date_in else 0
                )

                # Get the first phone number or use 'Not provided'
                customer_phone = "Not provided"
                if (
                    hasattr(task.customer, "phone_numbers")
                    and task.customer.phone_numbers.exists()
                ):
                    customer_phone = task.customer.phone_numbers.first().phone_number

                tasks_data.append(
                    {
                        "task_id": task.title,
                        "customer_name": task.customer.name,
                        "customer_phone": customer_phone,
                        "total_cost": float(total_cost),
                        "paid_amount": float(paid_amount),
                        "outstanding_balance": float(outstanding_balance),
                        "days_overdue": days_overdue,
                        "status": task.status,
                        "date_in": task.date_in.isoformat() if task.date_in else None,
                    }
                )

        # Sort by outstanding balance (highest first)
        tasks_data.sort(key=lambda x: x["outstanding_balance"], reverse=True)

        total_outstanding = sum(task["outstanding_balance"] for task in tasks_data)

        return {
            "outstanding_tasks": tasks_data,
            "summary": {
                "total_outstanding": total_outstanding,
                "task_count": len(tasks_data),
                "average_balance": (
                    total_outstanding / len(tasks_data) if tasks_data else 0
                ),
            },
            "date_range": actual_date_range,
            "duration_info": {
                "days": duration_days,
                "description": duration_description
            },
            "start_date": start_date,
            "end_date": end_date,
        }   

    @staticmethod
    def generate_technician_performance_report(date_range='last_7_days', start_date=None, end_date=None):
        """Generate comprehensive technician performance report with task status grouping."""
        date_filter_q, actual_date_range, duration_days, duration_description = PredefinedReportGenerator._get_date_filter(
            date_range, field="timestamp", start_date=start_date, end_date=end_date
        )

        # Get all active technicians
        technicians = User.objects.filter(
            role="Technician", is_active=True
        ).prefetch_related("tasks")

        if not technicians.exists():
            return {
                "technician_performance": [],
                "date_range": actual_date_range,
                "duration_info": {
                    "days": duration_days,
                    "description": duration_description
                },
                "total_technicians": 0,
            }

        final_report = []

        for technician in technicians:
            # Get all tasks assigned to this technician
            all_tasks = technician.tasks.all()

            # Group tasks by status
            tasks_by_status = {}
            for task in all_tasks:
                status = task.status
                if status not in tasks_by_status:
                    tasks_by_status[status] = []

                tasks_by_status[status].append(
                    {
                        "task_id": task.id,
                        "task_title": task.title,
                        "customer_name": task.customer.name if task.customer else "N/A",
                        "laptop_model": task.laptop_model,
                        "date_in": task.date_in.isoformat() if task.date_in else "N/A",
                        "estimated_cost": (
                            float(task.estimated_cost) if task.estimated_cost else 0
                        ),
                        "total_cost": float(task.total_cost) if task.total_cost else 0,
                        "paid_amount": (
                            float(task.paid_amount) if task.paid_amount else 0
                        ),
                    }
                )

            # Calculate completed tasks metrics (using READY activities for accuracy)
            ready_activities = (
                TaskActivity.objects.filter(
                    task__assigned_to=technician, type=TaskActivity.ActivityType.READY
                )
                .filter(date_filter_q)
                .select_related("task")
            )

            completed_tasks_data = []
            total_completion_seconds = 0

            for ready_activity in ready_activities:
                task = ready_activity.task

                # Find intake time for this task
                intake_activity = (
                    TaskActivity.objects.filter(
                        task=task, type=TaskActivity.ActivityType.INTAKE
                    )
                    .order_by("timestamp")
                    .first()
                )

                if intake_activity:
                    completion_duration = (
                        ready_activity.timestamp - intake_activity.timestamp
                    )
                    completion_hours = completion_duration.total_seconds() / 3600
                    total_completion_seconds += completion_duration.total_seconds()

                    completed_tasks_data.append(
                        {
                            "task_id": task.id,
                            "task_title": task.title,
                            "completion_hours": round(completion_hours, 1),
                            "revenue": float(task.estimated_cost or 0),
                        }
                    )

            # Calculate performance metrics
            completed_tasks_count = len(completed_tasks_data)
            total_revenue = sum(task["revenue"] for task in completed_tasks_data)
            avg_completion_hours = (
                total_completion_seconds / (completed_tasks_count * 3600)
                if completed_tasks_count > 0
                else 0
            )
            in_progress_tasks = len(tasks_by_status.get("In Progress", []))

            # Count tasks by status
            status_counts = {
                status: len(tasks) for status, tasks in tasks_by_status.items()
            }

            # Get current assigned tasks (all statuses except completed/picked up)
            current_tasks = all_tasks.exclude(
                status__in=["Completed", "Picked Up", "Terminated"]
            )
            current_task_count = current_tasks.count()

            technician_data = {
                "technician_id": technician.id,
                "technician_name": technician.get_full_name(),
                "technician_email": technician.email,
                "completed_tasks_count": completed_tasks_count,
                "total_revenue_generated": round(total_revenue, 2),
                "avg_completion_hours": round(avg_completion_hours, 1),
                "current_in_progress_tasks": in_progress_tasks,
                "current_assigned_tasks": current_task_count,
                # Task status breakdown
                "tasks_by_status": tasks_by_status,
                "status_counts": status_counts,
                # Detailed completed tasks
                "completed_tasks_detail": completed_tasks_data,
                # Summary stats
                "total_tasks_handled": all_tasks.count(),
                "completion_rate": (
                    (completed_tasks_count / all_tasks.count() * 100)
                    if all_tasks.count() > 0
                    else 0
                ),
                # Current workload indicators
                "workload_level": (
                    "High"
                    if current_task_count > 8
                    else "Medium" if current_task_count > 4 else "Low"
                ),
            }

            final_report.append(technician_data)

        # Sort by completed tasks (most productive first)
        final_report.sort(key=lambda x: x["completed_tasks_count"], reverse=True)

        return {
            "technician_performance": final_report,
            "date_range": actual_date_range,
            "duration_info": {
                "days": duration_days,
                "description": duration_description
            },
            'start_date': start_date,
            'end_date': end_date,
            "total_technicians": len(final_report),
            "summary": {
                "total_completed_tasks": sum(
                    tech["completed_tasks_count"] for tech in final_report
                ),
                "total_revenue": sum(
                    tech["total_revenue_generated"] for tech in final_report
                ),
                "avg_completion_hours": (
                    sum(tech["avg_completion_hours"] for tech in final_report)
                    / len(final_report)
                    if final_report
                    else 0
                ),
                "total_current_tasks": sum(
                    tech["current_assigned_tasks"] for tech in final_report
                ),
            },
        }

    @staticmethod
    def generate_payment_methods_report(date_range='last_7_days', start_date=None, end_date=None):
        """Generate payment methods breakdown report"""
        date_filter, actual_date_range, duration_days, duration_description = PredefinedReportGenerator._get_date_filter(date_range, start_date, end_date)

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
            "start_date": start_date,
            "end_date": end_date,
        }

    @staticmethod
    def generate_task_status_report(date_range='last_7_days', start_date=None, end_date=None):
        """Generate task status overview report with date range support"""
        # Apply date filter to tasks based on date_in field
        date_filter, actual_date_range, duration_days, duration_description = PredefinedReportGenerator._get_date_filter(date_range, start_date, end_date, field='date_in')
        
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

        return {
            "status_distribution": status_data,
            "urgency_distribution": list(urgency_counts),
            "total_tasks": total_tasks,
            "generated_at": timezone.now(),
            "date_range": actual_date_range,
            "duration_info": {
                "days": duration_days,
                "description": duration_description
            },
            "start_date": start_date,
            "end_date": end_date,
        }

    @staticmethod
    def generate_turnaround_time_report(period_type="weekly", date_range='last_7_days', start_date=None, end_date=None):
        """Generate turnaround time report with individual task details and date range support."""
        
        # Apply date filter based on intake activity timestamps
        date_filter, actual_date_range, duration_days, duration_description = PredefinedReportGenerator._get_date_filter(date_range, start_date, end_date, field='timestamp')
        
        # Get tasks that were picked up within the date range by filtering through activities
        timestamp_gte = date_filter.children[0][1]
        timestamp_lte = date_filter.children[1][1]
        
        tasks = (
            Task.objects.filter(
                activities__type="picked_up",
                activities__timestamp__gte=timestamp_gte,
                activities__timestamp__lte=timestamp_lte
            )
            .distinct()
            .prefetch_related("activities")
        )

        if not tasks.exists():
            return {
                "periods": [],
                "task_details": [],
                "summary": {
                    "overall_average": 0,
                    "best_period": "N/A",
                    "improvement": 0,
                    "total_tasks_analyzed": 0,
                },
                "date_range": actual_date_range,
                "duration_info": {
                    "days": duration_days,
                    "description": duration_description
                },
                "start_date": start_date,
                "end_date": end_date,
            }

        grouped_tasks = {}
        task_details = []
        tasks_with_issues = 0

        for task in tasks:
            # Get all activities for this task
            activities = task.activities.all().order_by("timestamp")

            try:
                # Find ALL picked_up activities within our date range and get the MOST RECENT one
                pickup_activities_in_range = activities.filter(
                    type=TaskActivity.ActivityType.PICKED_UP,
                    timestamp__gte=timestamp_gte,
                    timestamp__lte=timestamp_lte
                ).order_by('-timestamp')  # Order by most recent first
                
                # Get the most recent pickup activity (the first one in the sorted list)
                most_recent_pickup = pickup_activities_in_range.first()

                if not most_recent_pickup:
                    tasks_with_issues += 1
                    continue

                # Find intake activity
                first_intake = activities.filter(
                    type=TaskActivity.ActivityType.INTAKE
                ).first()

                if not first_intake:
                    tasks_with_issues += 1
                    continue

                # Calculate gross duration from intake to MOST RECENT pickup
                gross_duration = most_recent_pickup.timestamp - first_intake.timestamp

                total_away_time = timedelta(0)
                pickup_events = activities.filter(type=TaskActivity.ActivityType.PICKED_UP)
                return_events = activities.filter(type=TaskActivity.ActivityType.RETURNED)
                
                # Count the number of times the task has been returned
                return_count = return_events.count()

                # Calculate total time the device was away from workshop (picked up but not returned)
                for pickup in pickup_events:
                    next_return = return_events.filter(timestamp__gt=pickup.timestamp).first()
                    if next_return:
                        away_time = next_return.timestamp - pickup.timestamp
                        total_away_time += away_time

                # Calculate net turnaround time (gross minus time away)
                net_turnaround_duration = gross_duration - total_away_time

                if net_turnaround_duration.total_seconds() < 0:
                    net_turnaround_duration = timedelta(0)

                # Convert to whole number of days (rounded up to nearest whole day)
                turnaround_days = net_turnaround_duration.total_seconds() / (24 * 3600)
                turnaround_days_whole = int(round(turnaround_days))

                # Group by period based on MOST RECENT pickup date
                end_time = most_recent_pickup.timestamp
                if period_type == "weekly":
                    period_key = end_time.strftime("%Y-W%U")
                elif period_type == "monthly":
                    period_key = end_time.strftime("%Y-%m")
                else:
                    period_key = "overall"

                if period_key not in grouped_tasks:
                    grouped_tasks[period_key] = []
                grouped_tasks[period_key].append(turnaround_days_whole)

                # Convert to local timezone for display
                import pytz
                utc_plus_3 = pytz.timezone('Etc/GMT-3')  # UTC+3 timezone
                
                local_pickup_time = most_recent_pickup.timestamp.astimezone(utc_plus_3)
                local_intake_time = first_intake.timestamp.astimezone(utc_plus_3)

                # Format times in 12-hour system with local timezone
                pickup_date_str = local_pickup_time.date().isoformat()
                pickup_time_str = local_pickup_time.strftime("%I:%M %p")  # 12-hour format
                intake_date_str = local_intake_time.date().isoformat()
                intake_time_str = local_intake_time.strftime("%I:%M %p")  # 12-hour format

                # Store individual task details
                task_detail = {
                    "title": task.title,
                    "customer_name": task.customer.name if task.customer else "N/A",
                    "intake_date": intake_date_str,
                    "intake_time": intake_time_str,
                    "pickup_date": pickup_date_str,
                    "pickup_time": pickup_time_str,
                    "assigned_technician": (
                        task.assigned_to.get_full_name()
                        if task.assigned_to
                        else "Unassigned"
                    ),
                    "turnaround_days": turnaround_days_whole,
                    "return_count": return_count,
                    "pickup_count": pickup_activities_in_range.count(),
                }
                task_details.append(task_detail)

            except Exception as e:
                tasks_with_issues += 1
                continue

        # Calculate period statistics
        periods_data = []
        all_turnaround_days = []

        for period, days_list in grouped_tasks.items():
            avg_turnaround = sum(days_list) / len(days_list) if days_list else 0
            period_data = {
                "period": period,
                "average_turnaround": int(round(avg_turnaround)),
                "tasks_completed": len(days_list),
            }
            periods_data.append(period_data)
            all_turnaround_days.extend(days_list)

        periods_data.sort(key=lambda x: x["period"])

        # Sort task details by turnaround time (slowest first)
        task_details.sort(key=lambda x: x["turnaround_days"], reverse=True)

        overall_average = (
            sum(all_turnaround_days) / len(all_turnaround_days)
            if all_turnaround_days
            else 0
        )
        
        best_period_data = (
            min(periods_data, key=lambda x: x["average_turnaround"])
            if periods_data
            else None
        )
        best_period = best_period_data["period"] if best_period_data else "N/A"

        improvement = 0
        if len(periods_data) > 1 and periods_data[-2]["average_turnaround"] > 0:
            improvement = (
                (
                    periods_data[-2]["average_turnaround"]
                    - periods_data[-1]["average_turnaround"]
                )
                / periods_data[-2]["average_turnaround"]
                * 100
            )

        # Calculate summary statistics for returns
        total_returns = sum(task["return_count"] for task in task_details)
        tasks_with_returns = sum(1 for task in task_details if task["return_count"] > 0)
        avg_returns_per_task = total_returns / len(task_details) if task_details else 0

        result = {
            "periods": periods_data,
            "task_details": task_details,
            "summary": {
                "overall_average": int(round(overall_average)),
                "best_period": best_period,
                "improvement": int(round(improvement)),
                "total_tasks_analyzed": len(task_details),
                "total_returns": total_returns,
                "tasks_with_returns": tasks_with_returns,
                "avg_returns_per_task": round(avg_returns_per_task, 2),
            },
            "date_range": actual_date_range,
            "duration_info": {
                "days": duration_days,
                "description": duration_description
            },
            "start_date": start_date,
            "end_date": end_date,
        }
        
        return result

    @staticmethod
    def generate_technician_workload_report(date_range='last_7_days', start_date=None, end_date=None):
        """Generate technician workload report with date range support"""
        # Apply date filter to tasks based on date_in field
        date_filter, actual_date_range, duration_days, duration_description = PredefinedReportGenerator._get_date_filter(date_range, start_date, end_date, field='date_in')
        
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
            "start_date": start_date,
            "end_date": end_date,
        }