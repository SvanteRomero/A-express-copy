# reports/generators/technician.py
"""Technician-related report generators."""
from django.db.models import Count, Q
from django.utils import timezone
from Eapp.models import Task, User, TaskActivity
from .base import ReportGeneratorBase


class TechnicianReportGenerator(ReportGeneratorBase):
    """Generates technician-related reports."""
    
    @staticmethod
    def generate_performance(date_range='last_7_days', start_date=None, end_date=None):
        """Generate comprehensive technician performance report with task status grouping."""
        date_filter_q, actual_date_range, duration_days, duration_description, start_date, end_date = (
            ReportGeneratorBase.get_date_filter(date_range, field="timestamp", start_date=start_date, end_date=end_date)
        )

        technicians = User.objects.filter(role="Technician", is_active=True)
        if not technicians.exists():
            return {
                "technician_performance": [],
                "date_range": actual_date_range,
                "duration_info": {"days": duration_days, "description": duration_description},
                "total_technicians": 0
            }

        technician_ids = [t.id for t in technicians]
        
        # Bulk fetch tasks and activities
        tasks = Task.objects.filter(assigned_to_id__in=technician_ids).select_related('customer', 'laptop_model')
        activities = TaskActivity.objects.filter(
            user_id__in=technician_ids,
            timestamp__gte=date_filter_q.children[0][1],
            timestamp__lte=date_filter_q.children[1][1] if len(date_filter_q.children) > 1 else timezone.now()
        )

        # Group data in memory
        tasks_by_tech = {tech_id: [] for tech_id in technician_ids}
        for task in tasks:
            tasks_by_tech[task.assigned_to_id].append(task)

        activities_by_tech = {tech_id: [] for tech_id in technician_ids}
        for activity in activities:
            activities_by_tech[activity.user_id].append(activity)


        final_report = []
        for tech in technicians:
            tech_tasks = tasks_by_tech[tech.id]
            
            # Completed tasks breakdown (includes Completed, Ready for Pickup, and Picked Up)
            completion_statuses = ["Completed", "Ready for Pickup", "Picked Up"]
            
            # Filter by date range if completed_at is set
            completed_tasks = []
            for t in tech_tasks:
                if t.status in completion_statuses:
                    # If date range filtering is active and task has completion date
                    if t.completed_at:
                        task_date = t.completed_at.date() if hasattr(t.completed_at, 'date') else t.completed_at
                        # Convert start/end to date if they are datetime
                        s_date = start_date.date() if hasattr(start_date, 'date') else start_date
                        e_date = end_date.date() if hasattr(end_date, 'date') else end_date
                        
                        if s_date and e_date:
                            if s_date <= task_date <= e_date:
                                completed_tasks.append(t)
                        else:
                            # No date range, include all
                            completed_tasks.append(t)
                    else:
                        # Fallback for tasks without completed_at (should utilize updated_at or similar if needed)
                        # For now, exclude to be safe or include if you want loose counting
                        # Using updated_at as fallback
                        task_date = t.updated_at.date()
                        s_date = start_date.date() if hasattr(start_date, 'date') else start_date
                        e_date = end_date.date() if hasattr(end_date, 'date') else end_date
                         
                        if s_date and e_date:
                            if s_date <= task_date <= e_date:
                                completed_tasks.append(t)

            total_completed = len(completed_tasks)
            
            # Solved/Not Solved breakdown
            solved_count = sum(1 for t in completed_tasks if t.workshop_status == "Solved")
            not_solved_count = sum(1 for t in completed_tasks if t.workshop_status == "Not Solved")
            
            # In Progress tasks and In Workshop subset
            # Note: in_progress_count excludes tasks that are In Workshop (they're counted separately)
            in_progress_tasks = [t for t in tech_tasks if t.status == "In Progress"]
            in_workshop_count = sum(1 for t in in_progress_tasks if t.workshop_status == "In Workshop")
            in_progress_count = sum(1 for t in in_progress_tasks if t.workshop_status != "In Workshop")
            
            # Current tasks (only In Progress)
            current_task_count = len(in_progress_tasks)
            
            # OPTIMIZED: Workshop rate using workshop_periods field instead of TaskActivity queries
            tasks_sent_to_workshop = sum(1 for t in tech_tasks if t.workshop_periods)
            total_tasks = len(tech_tasks)
            workshop_rate = (tasks_sent_to_workshop / total_tasks * 100) if total_tasks > 0 else 0
            
            # OPTIMIZED: Task involvement using execution_technicians field
            # Count tasks in period where this technician is in execution_technicians
            tasks_involved_count = sum(
                1 for t in tech_tasks 
                if t.execution_technicians and any(
                    tech_data.get('user_id') == tech.id 
                    for tech_data in t.execution_technicians
                )
            )
            percentage_of_tasks_involved = (tasks_involved_count / total_tasks * 100) if total_tasks > 0 else 0
            
            # FULL ATTRIBUTION: Calculate average completion hours for tasks this technician was involved in
            # Each technician gets credit for the full net execution time of tasks they worked on
            completed_tasks_with_times = [
                t for t in tech_tasks 
                if t.first_assigned_at 
                and t.completed_at
                and t.execution_technicians
                and any(tech_data.get('user_id') == tech.id for tech_data in t.execution_technicians)
            ]
            
            total_hours = 0
            for task in completed_tasks_with_times:
                net_hours = ReportGeneratorBase.calculate_net_execution_hours(task)
                total_hours += net_hours
            
            avg_completion_hours = (total_hours / len(completed_tasks_with_times)) if completed_tasks_with_times else 0
            
            # Calculate status counts (lightweight - just counts, not full task objects)
            status_counts = {}
            for task in tech_tasks:
                status = task.status
                status_counts[status] = status_counts.get(status, 0) + 1

            final_report.append({
                "technician_id": tech.id,
                "technician_name": tech.get_full_name(),
                "technician_email": tech.email,
                "completed_tasks_count": total_completed,
                "solved_count": solved_count,
                "not_solved_count": not_solved_count,
                "in_progress_count": in_progress_count,
                "in_workshop_count": in_workshop_count,
                "current_assigned_tasks": current_task_count,
                "workshop_rate": round(workshop_rate, 2),
                "percentage_of_tasks_involved": round(percentage_of_tasks_involved, 2),
                "avg_completion_hours": round(avg_completion_hours, 1),
                "status_counts": status_counts,
            })

        final_report.sort(key=lambda x: x["completed_tasks_count"], reverse=True)
        
        # Calculate unique counts for summary (avoid double-counting when tasks are reassigned/collaborated)
        unique_completed_task_ids = set()
        unique_current_task_ids = set()
        completion_statuses = ["Completed", "Ready for Pickup", "Picked Up"]
        
        # Iterate through all tasks directly
        for task in tasks:
            # Check if task was completed in date range
            if task.status in completion_statuses and task.completed_at:
                task_date = task.completed_at.date() if hasattr(task.completed_at, 'date') else task.completed_at
                s_date = start_date.date() if hasattr(start_date, 'date') else start_date
                e_date = end_date.date() if hasattr(end_date, 'date') else end_date
                if s_date <= task_date <= e_date:
                    unique_completed_task_ids.add(task.id)
            elif task.status == "In Progress":
                unique_current_task_ids.add(task.id)

        return {
            "technician_performance": final_report,
            "date_range": actual_date_range,
            "duration_info": {"days": duration_days, "description": duration_description},
            'start_date': start_date.isoformat() if start_date else None,
            'end_date': end_date.isoformat() if end_date else None,
            "total_technicians": len(final_report),
            "summary": {
                "total_completed_tasks": len(unique_completed_task_ids),
                "total_current_tasks": len(unique_current_task_ids),
                "total_tasks_in_period": len(unique_completed_task_ids) + len(unique_current_task_ids),
            },
        }
    
    @staticmethod
    def generate_workload(date_range='last_7_days', start_date=None, end_date=None):
        """Generate technician workload report with date range support."""
        # Apply date filter to tasks based on date_in field
        date_filter, actual_date_range, duration_days, duration_description, start_date, end_date = (
            ReportGeneratorBase.get_date_filter(date_range, start_date, end_date, field='date_in')
        )
        
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
            workload_list.append({
                "name": f"{tech['first_name']} {tech['last_name']}",
                "tasks": tech["total_tasks"],
                "in_progress": tech["in_progress_tasks"],
                "awaiting_parts": tech["awaiting_parts_tasks"],
                "pending": tech["pending_tasks"],
            })

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
