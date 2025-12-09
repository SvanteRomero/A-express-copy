from datetime import timedelta

# Create your views here.
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count
from Eapp.serializers import ReportConfigSerializer
from reports.predefined_reports import PredefinedReportGenerator
from reports.services import ReportGenerator
from users.permissions import IsAdminOrManagerOrFrontDeskOrAccountant
from financials.models import Payment
from Eapp.models import Task, TaskActivity
from users.models import User


@api_view(["POST"])
@permission_classes(
    [permissions.IsAuthenticated]
)
def generate_custom_report(request):

    try:
        report_config = request.data

        # Validate report config
        config_serializer = ReportConfigSerializer(data=report_config)
        if not config_serializer.is_valid():
            return Response(
                config_serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )

        generator = ReportGenerator(report_config)
        report_data = generator.generate_report()

        return Response({"success": True, "report": report_data})

    except Exception as e:
        return Response(
            {"success": False, "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes(
    [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]
)
def get_report_field_options(request):
    """
    Get available field options for reports
    """
    field_options = {
        "reportTypes": [
            {
                "id": "financial",
                "label": "Financial Analysis",
                "description": "Revenue, payments, and cost analysis",
            },
            {
                "id": "operational",
                "label": "Operational Metrics",
                "description": "Task status, turnaround times, efficiency",
            },
            {
                "id": "performance",
                "label": "Performance Review",
                "description": "Technician productivity and quality metrics",
            },
            {
                "id": "customer",
                "label": "Customer Analytics",
                "description": "Customer satisfaction and retention data",
            },
        ],
        "dataFields": [
            {"id": "task_id", "label": "Task ID", "category": "basic"},
            {"id": "customer_name", "label": "Customer Name", "category": "basic"},
            {"id": "laptop_model", "label": "Laptop Model", "category": "basic"},
            {"id": "technician", "label": "Assigned Technician", "category": "basic"},
            {"id": "status", "label": "Current Status", "category": "basic"},
            {"id": "date_in", "label": "Date In", "category": "dates"},
            {"id": "date_completed", "label": "Date Completed", "category": "dates"},
            {
                "id": "turnaround_time",
                "label": "Turnaround Time",
                "category": "performance",
            },
            {"id": "total_cost", "label": "Total Cost", "category": "financial"},
            {"id": "parts_cost", "label": "Parts Cost", "category": "financial"},
            {"id": "labor_cost", "label": "Labor Cost", "category": "financial"},
            {
                "id": "payment_status",
                "label": "Payment Status",
                "category": "financial",
            },
            {"id": "urgency", "label": "Urgency Level", "category": "basic"},
            {"id": "location", "label": "Current Location", "category": "basic"},
        ],
        "dateRanges": [
            {"value": "last_7_days", "label": "Last 7 Days"},
            {"value": "last_30_days", "label": "Last 30 Days"},
            {"value": "last_3_months", "label": "Last 3 Months"},
            {"value": "last_6_months", "label": "Last 6 Months"},
            {"value": "last_year", "label": "Last Year"},
            {"value": "custom", "label": "Custom Range"},
        ],
    }
    return Response(field_options)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant])
def get_revenue_summary(request):
    """Get revenue summary report with custom date range and pagination support"""
    # NOTE: This report has been removed. The endpoint and generator were deleted.
    return Response({"success": False, "error": "Revenue summary report has been removed."}, status=status.HTTP_410_GONE)


@api_view(["GET"])
@permission_classes(
    [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]
)
def get_task_status_report(request):
    """Get task status report with date range support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    try:
        report_data = PredefinedReportGenerator.generate_task_status_report(
            date_range, start_date, end_date
        )
        return Response({"success": True, "report": report_data, "type": "task_status"})
    except Exception as e:
        return Response(
            {"success": False, "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes(
    [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]
)
def get_technician_performance(request):
    """Get technician performance report with custom date range support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    try:
        report_data = PredefinedReportGenerator.generate_technician_performance_report(
            date_range, start_date, end_date
        )
        return Response(
            {"success": True, "report": report_data, "type": "technician_performance"}
        )
    except Exception as e:
        return Response(
            {"success": False, "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes(
    [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]
)
def get_turnaround_time(request):
    """Get turnaround time report with date range and pagination support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")
    period_type = request.GET.get("period_type", "weekly")
    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("page_size", 10))

    print(f"🔍 DEBUG - Turnaround Time Request:")
    print(f"🔍   date_range: {date_range}")
    print(f"🔍   start_date: {start_date}")
    print(f"🔍   end_date: {end_date}")
    print(f"🔍   period_type: {period_type}")
    print(f"🔍   page: {page}")
    print(f"🔍   page_size: {page_size}")

    try:
        print(f"🔍 DEBUG - Calling PredefinedReportGenerator.generate_turnaround_time_report...")
        
        report_data = PredefinedReportGenerator.generate_turnaround_time_report(
            period_type, date_range, start_date, end_date
        )
        
        print(f"🔍 DEBUG - Raw report data received:")
        print(f"🔍   periods count: {len(report_data.get('periods', []))}")
        print(f"🔍   task_details count: {len(report_data.get('task_details', []))}")
        print(f"🔍   summary keys: {report_data.get('summary', {}).keys()}")
        
        # Add pagination to task_details
        task_details = report_data.get("task_details", [])
        total_tasks = len(task_details)
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        
        print(f"🔍 DEBUG - Pagination calculations:")
        print(f"🔍   total_tasks: {total_tasks}")
        print(f"🔍   start_index: {start_index}")
        print(f"🔍   end_index: {end_index}")
        
        # Handle pagination bounds
        if start_index >= total_tasks:
            print(f"🔍 DEBUG - Start index out of range! Returning empty page.")
            paginated_task_details = []
        else:
            print(f"🔍 DEBUG - Slicing task_details from {start_index} to {end_index}")
            paginated_task_details = task_details[start_index:end_index]
            print(f"🔍 DEBUG - Paginated tasks count: {len(paginated_task_details)}")
        
        # Create paginated response
        paginated_report = {
            "periods": report_data.get("periods", []),
            "task_details": paginated_task_details,
            "summary": report_data.get("summary", {}),
            "date_range": report_data.get("date_range"),
            "duration_info": report_data.get("duration_info", {}),
            "start_date": report_data.get("start_date"),
            "end_date": report_data.get("end_date"),
            "pagination": {
                "current_page": page,
                "page_size": page_size,
                "total_tasks": total_tasks,
                "total_pages": (total_tasks + page_size - 1) // page_size,
                "has_next": end_index < total_tasks,
                "has_previous": page > 1
            }
        }

        print(f"🔍 DEBUG - Final pagination info:")
        print(f"🔍   current_page: {paginated_report['pagination']['current_page']}")
        print(f"🔍   total_pages: {paginated_report['pagination']['total_pages']}")
        print(f"🔍   has_next: {paginated_report['pagination']['has_next']}")
        print(f"🔍   has_previous: {paginated_report['pagination']['has_previous']}")
        
        return Response(
            {"success": True, "report": paginated_report, "type": "turnaround_time"}
        )
    except Exception as e:
        print(f"❌ DEBUG - ERROR in get_turnaround_time:")
        print(f"❌   Error type: {type(e).__name__}")
        print(f"❌   Error message: {str(e)}")
        print(f"❌   Full traceback:")
        import traceback
        traceback.print_exc()
        
        return Response(
            {"success": False, "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes(
    [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]
)
def get_technician_workload(request):
    """Get technician workload report with date range support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    try:
        report_data = PredefinedReportGenerator.generate_technician_workload_report(
            date_range, start_date, end_date
        )
        return Response(
            {"success": True, "report": report_data, "type": "technician_workload"}
        )
    except Exception as e:
        return Response(
            {"success": False, "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes(
    [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]
)
def get_payment_methods_report(request):
    """Get payment methods report with custom date range support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    try:
        report_data = PredefinedReportGenerator.generate_payment_methods_report(
            date_range, start_date, end_date
        )
        return Response(
            {"success": True, "report": report_data, "type": "payment_methods"}
        )
    except Exception as e:
        return Response(
            {"success": False, "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )




@api_view(["GET"])
@permission_classes(
    [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]
)
def get_dashboard_data(request):
    """Get data for dashboard widgets (KPI cards, charts)"""
    try:
        # KPI Data
        total_active_tasks = Task.objects.exclude(
            status__in=["Completed", "Picked Up", "Terminated"]
        ).count()

        revenue_this_month = (
            Payment.objects.filter(
                date__month=timezone.now().month, date__year=timezone.now().year
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )

        tasks_ready_for_pickup = Task.objects.filter(status="Ready for Pickup").count()

        # Average repair time (simplified)
        completed_tasks = Task.objects.filter(
            status="Completed", date_in__isnull=False, date_out__isnull=False
        )
        avg_repair_time = "3.2 days"  # This would be calculated

        kpi_data = {
            "totalActiveTasks": total_active_tasks,
            "revenueThisMonth": float(revenue_this_month),
            "tasksReadyForPickup": tasks_ready_for_pickup,
            "averageRepairTime": avg_repair_time,
        }

        # Technician workload for chart
        workload_data = PredefinedReportGenerator.generate_technician_workload_report()

        # Task status for pie chart
        status_data = PredefinedReportGenerator.generate_task_status_report()

        return Response(
            {
                "kpiData": kpi_data,
                "technicianWorkload": workload_data.get("workload_data", []),
                "taskStatuses": status_data.get("status_distribution", []),
            }
        )

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def revenue_overview(request):
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

    return Response(
        {
            "opening_balance": opening_balance,
            "today_revenue": today_revenue,
            "day_over_day_change": day_over_day_change,
            "today_expenditure": abs(today_expenditure),
            "expenditure_day_over_day_change": expenditure_day_over_day_change,
        }
    )
 
 
   
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant])
def get_laptops_in_shop_by_location(request):
    """Get laptops in shop by location report with date range support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    try:
        report_data = PredefinedReportGenerator.generate_laptops_in_shop_by_location(
            date_range, start_date, end_date
        )
        return Response({
            "success": True, 
            "report": report_data, 
            "type": "laptops_in_shop_by_location"
        })
    except Exception as e:
        return Response(
            {"success": False, "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
        
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant])
def get_front_desk_performance(request):
    """Get front desk performance report with custom date range support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date_str = request.GET.get("start_date")
    end_date_str = request.GET.get("end_date")

    end_date = timezone.now()
    if date_range == "last_7_days":
        start_date = end_date - timedelta(days=7)
    elif date_range == "last_30_days":
        start_date = end_date - timedelta(days=30)
    elif date_range == "last_3_months":
        start_date = end_date - timedelta(days=90)
    elif date_range == "last_6_months":
        start_date = end_date - timedelta(days=180)
    elif date_range == "last_year":
        start_date = end_date - timedelta(days=365)
    elif date_range == "custom" and start_date_str and end_date_str:
        start_date = timezone.datetime.fromisoformat(start_date_str)
        end_date = timezone.datetime.fromisoformat(end_date_str)
    else: # Default
        start_date = end_date - timedelta(days=30)

    front_desk_users = User.objects.filter(role="Front Desk")
    
    approved_activities = TaskActivity.objects.filter(
        type=TaskActivity.ActivityType.READY,
        timestamp__range=(start_date, end_date),
        user__in=front_desk_users
    ).values('user__id', 'user__first_name', 'user__last_name').annotate(count=Count('id'))

    sent_out_activities = TaskActivity.objects.filter(
        type=TaskActivity.ActivityType.PICKED_UP,
        timestamp__range=(start_date, end_date),
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
            "start_date": start_date.strftime('%Y-%m-%d'),
            "end_date": end_date.strftime('%Y-%m-%d'),
        }
    }

    return Response({"success": True, "report": report_data, "type": "front_desk_performance"})

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant])
def get_outstanding_payments(request):
    """Get outstanding payments report with date range and pagination support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")
    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("page_size", 10))

    try:
        report_data = PredefinedReportGenerator.generate_outstanding_payments_report(
            date_range, start_date, end_date
        )
        
        # Add pagination to the response
        tasks = report_data["outstanding_tasks"]
        total_tasks = len(tasks)
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_tasks = tasks[start_index:end_index]
        
        paginated_report = {
            "outstanding_tasks": paginated_tasks,
            "summary": report_data["summary"],
            "date_range": report_data["date_range"],
            "start_date": report_data["start_date"],
            "end_date": report_data["end_date"],
            "pagination": {
                "current_page": page,
                "page_size": page_size,
                "total_tasks": total_tasks,
                "total_pages": (total_tasks + page_size - 1) // page_size,
                "has_next": end_index < total_tasks,
                "has_previous": page > 1
            }
        }
        
        return Response({
            "success": True, 
            "report": paginated_report, 
            "type": "outstanding_payments"
        })
    except Exception as e:
        return Response(
            {"success": False, "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )