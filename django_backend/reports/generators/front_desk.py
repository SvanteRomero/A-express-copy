# reports/generators/front_desk.py
"""Front desk performance report generators."""
from django.db.models import Count
from Eapp.models import User, TaskActivity, Task
from .base import ReportGeneratorBase


class FrontDeskReportGenerator(ReportGeneratorBase):
    """Generates front desk reports."""
    
    @staticmethod
    def generate_performance(date_range='last_30_days', start_date=None, end_date=None):
        """Generate front desk performance report with custom date range support."""
        # For activities, filter by timestamp
        date_filter, actual_date_range, duration_days, duration_description, start_date, end_date = (
            ReportGeneratorBase.get_date_filter(date_range, start_date, end_date, field='timestamp')
        )
        
        # For task creation, filter on created_at
        creation_date_filter, _, _, _, _, _ = ReportGeneratorBase.get_date_filter(
            date_range, start_date, end_date, field='created_at'
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
        
        # Tasks Created by Front Desk
        created_tasks = Task.objects.filter(
            creation_date_filter,
            created_by__in=front_desk_users
        ).values('created_by__id', 'created_by__first_name', 'created_by__last_name').annotate(count=Count('id'))

        total_approved = sum(item['count'] for item in approved_activities)
        total_sent_out = sum(item['count'] for item in sent_out_activities)
        total_created = sum(item['count'] for item in created_tasks)

        performance_data = {}

        # Helper to ensure user dict exists
        def get_or_create_user_entry(user_id, first_name, last_name):
            if user_id not in performance_data:
                performance_data[user_id] = {
                    "user_name": f"{first_name} {last_name}",
                    "approved_count": 0,
                    "sent_out_count": 0,
                    "created_count": 0
                }
            return performance_data[user_id]

        for activity in approved_activities:
            entry = get_or_create_user_entry(activity['user__id'], activity['user__first_name'], activity['user__last_name'])
            entry['approved_count'] = activity['count']

        for activity in sent_out_activities:
            entry = get_or_create_user_entry(activity['user__id'], activity['user__first_name'], activity['user__last_name'])
            entry['sent_out_count'] = activity['count']
            
        for task in created_tasks:
            entry = get_or_create_user_entry(task['created_by__id'], task['created_by__first_name'], task['created_by__last_name'])
            entry['created_count'] = task['count']
            
        for user_id, data in performance_data.items():
            data['approved_percentage'] = (data['approved_count'] / total_approved * 100) if total_approved > 0 else 0
            data['sent_out_percentage'] = (data['sent_out_count'] / total_sent_out * 100) if total_sent_out > 0 else 0
            data['created_percentage'] = (data['created_count'] / total_created * 100) if total_created > 0 else 0
        
        report_data = {
            "performance": list(performance_data.values()),
            "summary": {
                "total_approved": total_approved,
                "total_sent_out": total_sent_out,
                "total_created": total_created,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            }
        }
        return report_data
