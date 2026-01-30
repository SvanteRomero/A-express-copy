# reports/generators/operational.py
"""Operational report generators for task status and execution."""
from django.db.models import Count, Q, F
from django.utils import timezone
from django.core.paginator import Paginator
from datetime import datetime, timedelta
import pytz
from Eapp.models import Task
from common.encryption import decrypt_value
from .base import ReportGeneratorBase


class OperationalReportGenerator(ReportGeneratorBase):
    """Generates operational reports."""
    
    @staticmethod
    def generate_task_status(date_range='last_7_days', start_date=None, end_date=None):
        """Generate task status overview report with date range support."""
        # Apply date filter to tasks based on date_in field
        date_filter, actual_date_range, duration_days, duration_description, start_date, end_date = (
            ReportGeneratorBase.get_date_filter(date_range, start_date, end_date, field='date_in')
        )
        
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
            status_data.append({
                "status": item["status"],
                "count": item["count"],
                "percentage": round(percentage, 1),
            })

        # Urgency distribution
        urgency_counts = filtered_tasks.values("urgency").annotate(count=Count("id"))

        # Most popular brand and model
        popular_brand = filtered_tasks.values('brand__name').annotate(brand_count=Count('brand')).order_by('-brand_count').first()
        popular_model = filtered_tasks.values('laptop_model__name').annotate(model_count=Count('laptop_model')).order_by('-model_count').first()

        # Top 5 brands and models
        top_brands = list(filtered_tasks.values('brand__name').annotate(count=Count('brand')).order_by('-count').filter(brand__name__isnull=False)[:5])
        top_models_query = list(filtered_tasks.values('laptop_model__name').annotate(count=Count('laptop_model')).order_by('-count').filter(laptop_model__name__isnull=False)[:5])
        top_models = [{'laptop_model': item['laptop_model__name'], 'count': item['count']} for item in top_models_query]

        # Calculate overdue pickup count
        overdue_threshold = timezone.now() - timedelta(days=7)
        overdue_tasks_query = Task.objects.filter(
            status='Ready for Pickup',
            ready_for_pickup_at__lte=overdue_threshold
        ).select_related('customer').order_by('ready_for_pickup_at')[:10]
        
        overdue_pickup_count = Task.objects.filter(
            status='Ready for Pickup',
            ready_for_pickup_at__lte=overdue_threshold
        ).count()

        overdue_tasks_list = []
        for t in overdue_tasks_query:
            total_days_ready = (timezone.now() - t.ready_for_pickup_at).days if t.ready_for_pickup_at else 0
            days_overdue = max(0, total_days_ready - 7)
            
            # Decrypt phone if needed
            customer_phone = "N/A"
            if t.customer and hasattr(t.customer, "phone_numbers") and t.customer.phone_numbers.exists():
                encrypted_phone = t.customer.phone_numbers.first().phone_number
                customer_phone = decrypt_value(encrypted_phone) or encrypted_phone

            overdue_tasks_list.append({
                "id": t.id,
                "title": t.title,
                "customer_name": t.customer.name if t.customer else "N/A",
                "customer_phone": customer_phone,
                "ready_since": t.ready_for_pickup_at.isoformat() if t.ready_for_pickup_at else None,
                "days_overdue": days_overdue
            })

        return {
            "status_distribution": status_data,
            "urgency_distribution": list(urgency_counts),
            "total_tasks": total_tasks,
            "overdue_pickup_count": overdue_pickup_count,
            "overdue_tasks": overdue_tasks_list,
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
    def generate_task_execution(period_type=None, date_range='last_7_days', start_date=None, end_date=None, page=1, page_size=10):
        """Generate task execution report based on assignment to completion time."""
        # Apply date filter based on COMPLETED_AT field
        date_filter, actual_date_range, duration_days, duration_description, start_date, end_date = (
            ReportGeneratorBase.get_date_filter(date_range, start_date, end_date, field='completed_at')
        )
        
        # Query tasks with both assignment and completion times
        tasks = (
            Task.objects.filter(
                date_filter,
                first_assigned_at__isnull=False,
                completed_at__isnull=False,
            )
            .select_related('customer')
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
        if duration_days <= 7:
            period_type = 'daily'
        elif duration_days <= 30:
            period_type = 'weekly'
        elif duration_days <= 90:
            period_type = 'monthly'
        else:
            period_type = 'quarterly'

        grouped_data = {}
        task_details = []
        all_execution_hours = []
        all_workshop_hours = []
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
                            reassigned_at = task.completed_at
                            
                        return_duration =reassigned_at - returned_at
                        total_return_hours += return_duration.total_seconds() / 3600

            # Subtract workshop periods
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
            
            if period_key not in grouped_data:
                grouped_data[period_key] = {'execution': [], 'workshop': []}
            grouped_data[period_key]['execution'].append(net_hours)
            grouped_data[period_key]['workshop'].append(total_workshop_hours)
            
            all_execution_hours.append(net_hours)
            all_workshop_hours.append(total_workshop_hours)
            
            # Format technicians list
            technicians_str = "Unassigned"
            if task.execution_technicians:
                tech_names = [t.get('name', 'Unknown') for t in task.execution_technicians]
                technicians_str = ", ".join(tech_names)
            
            # Format display times
            local_start = task.first_assigned_at.astimezone(utc_plus_3)
            local_end = task.completed_at.astimezone(utc_plus_3)
            
            # Build task detail
            task_details.append({
                "task_title": task.title,
                "customer_name": task.customer.name if task.customer else "N/A",
                "execution_start": local_start.strftime("%b %d, %Y %I:%M %p"),
                "execution_end": local_end.strftime("%b %d, %Y %I:%M %p"),
                "technicians": technicians_str,
                "technician_count": len(task.execution_technicians),
                "execution_hours": round(net_hours, 1),
                "workshop_hours": round(total_workshop_hours, 1),
                "return_count": task.return_count,
            })
        
        # Calculate period statistics
        periods_data = []
        
        for period, metrics in grouped_data.items():
            exec_hours = metrics['execution']
            workshop_hours = metrics['workshop']
            
            avg_exec = sum(exec_hours) / len(exec_hours) if exec_hours else 0
            
            # Calculate workshop metrics for period
            workshop_tasks = [h for h in workshop_hours if h > 0]
            avg_workshop = sum(workshop_tasks) / len(workshop_tasks) if workshop_tasks else 0
            
            periods_data.append({
                "period": period,
                "average_execution_hours": round(avg_exec, 1),
                "average_workshop_hours": round(avg_workshop, 1),
                "workshop_count": len(workshop_tasks),
                "tasks_completed": len(exec_hours),
            })
        
        periods_data.sort(key=lambda x: x["period"])

        # Reformat periods for display (Human Readable)
        if period_type == 'daily':
            for p in periods_data:
                try:
                    p['period'] = datetime.strptime(p['period'], "%Y-%m-%d").strftime("%b %d, %Y")
                except: pass
        elif period_type == 'monthly':
            for p in periods_data:
                try:
                    p['period'] = datetime.strptime(p['period'], "%Y-%m").strftime("%b %Y")
                except: pass
        elif period_type == 'weekly':
            for p in periods_data:
                try:
                    year, week = p['period'].split('-W')
                    p['period'] = f"Week {week}, {year}"
                except: pass
        
        # Sort by execution time (slowest first)
        task_details.sort(key=lambda x: x["execution_hours"], reverse=True)
        
        # Paginate
        paginator = Paginator(task_details, page_size)
        paginated_tasks = paginator.get_page(page)
        
        # Calculate summary
        overall_avg = sum(all_execution_hours) / len(all_execution_hours) if all_execution_hours else 0
        
        # Workshop summary
        tasks_with_workshop = [h for h in all_workshop_hours if h > 0]
        overall_avg_workshop = sum(tasks_with_workshop) / len(tasks_with_workshop) if tasks_with_workshop else 0
        total_tasks_workshop = len(tasks_with_workshop)
        
        total_returns = sum(t["return_count"] for t in task_details)
        tasks_with_returns = sum(1 for t in task_details if t["return_count"] > 0)
        
        # Calculate best period (fastest average execution)
        best_period = None
        if periods_data:
            sorted_by_speed = sorted(periods_data, key=lambda x: x["average_execution_hours"])
            best_period = sorted_by_speed[0]["period"]

        return {
            "periods": periods_data,
            "task_details": list(paginated_tasks),
            "summary": {
                "overall_average_hours": round(overall_avg, 1),
                "overall_average_workshop_hours": round(overall_avg_workshop, 1),
                "total_tasks_workshop": total_tasks_workshop,
                "fastest_task_hours": round(min(all_execution_hours), 1) if all_execution_hours else 0,
                "slowest_task_hours": round(max(all_execution_hours), 1) if all_execution_hours else 0,
                "top_5_fastest": task_details[-5:][::-1] if len(task_details) > 0 else [],
                "top_5_slowest": task_details[:5] if len(task_details) > 0 else [],
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
