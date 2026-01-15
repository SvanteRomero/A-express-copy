from django.db.models import Sum
from django.utils import timezone
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from financials.models import Payment
from messaging.models import MessageLog
from .models import Task

class DashboardStats(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        now = timezone.now()
        
        # 1. New Tasks Created Today
        new_tasks_count = Task.objects.filter(created_at__date=today).count()
        
        # 2. Messages Sent Today
        messages_sent_count = MessageLog.objects.filter(sent_at__date=today, status='sent').count()
        
        # 3. Tasks Ready for Pickup
        tasks_ready_for_pickup_count = Task.objects.filter(status=Task.Status.READY_FOR_PICKUP).count()

        # 4. Total Active Tasks (excluding closed states)
        total_active_tasks_count = Task.objects.exclude(
            status__in=["Ready for Pickup", "Picked Up", "Terminated", "Completed"]
        ).count()

        # 5. Revenue This Month
        revenue_this_month = (
            Payment.objects.filter(
                date__month=now.month, date__year=now.year
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )
        
        data = {
            "new_tasks_count": new_tasks_count,
            "messages_sent_count": messages_sent_count,
            "tasks_ready_for_pickup_count": tasks_ready_for_pickup_count,
            "active_tasks_count": total_active_tasks_count,
            "revenue_this_month": float(revenue_this_month),
        }
        return Response(data)
