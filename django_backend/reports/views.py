from functools import wraps
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum
from django_ratelimit.decorators import ratelimit
from Eapp.serializers import ReportConfigSerializer
from reports.predefined_reports import PredefinedReportGenerator
from reports.services import ReportGenerator
from users.permissions import IsAdminOrManagerOrFrontDeskOrAccountant
from financials.models import Payment
from Eapp.models import Task

import logging

logger = logging.getLogger(__name__)

def api_view_try_except(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        try:
            return view_func(request, *args, **kwargs)
        except Exception as e:
            import traceback
            # Log detailed error server-side only
            logger.error(
                f"Error in {view_func.__name__}: {str(e)}\n{traceback.format_exc()}"
            )
            # Return generic error to client (no internal details)
            return Response(
                {"success": False, "error": "An internal error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    return _wrapped_view


@api_view(["POST"])
@permission_classes(
    [permissions.IsAuthenticated]
)
@api_view_try_except
def generate_custom_report(request):

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
                "description": "Task status, execution times, efficiency",
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
                "id": "task_execution",
                "label": "Task Execution",
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
@permission_classes(
    [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]
)
@api_view_try_except
def get_task_status_report(request):
    """Get task status report with date range support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    report_data = PredefinedReportGenerator.generate_task_status_report(
        date_range, start_date, end_date
    )
    return Response({"success": True, "report": report_data, "type": "task_status"})


@api_view(["GET"])
@permission_classes(
    [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]
)
@api_view_try_except
def get_technician_performance(request):
    """Get technician performance report with custom date range support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    report_data = PredefinedReportGenerator.generate_technician_performance_report(
        date_range, start_date, end_date
    )
    return Response(
        {"success": True, "report": report_data, "type": "technician_performance"}
    )


@api_view(["GET"])
@permission_classes(
    [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]
)
@api_view_try_except
def get_task_execution(request):
    """Get task execution report with date range and pagination support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")
    period_type = request.GET.get("period_type")
    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("page_size", 10))

    report_data = PredefinedReportGenerator.generate_task_execution_report(
        period_type, date_range, start_date, end_date, page, page_size
    )
    
    return Response(
        {"success": True, "report": report_data, "type": "task_execution"}
    )


@api_view(["GET"])
@permission_classes(
    [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]
)
@api_view_try_except
def get_technician_workload(request):
    """Get technician workload report with date range support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    report_data = PredefinedReportGenerator.generate_technician_workload_report(
        date_range, start_date, end_date
    )
    return Response(
        {"success": True, "report": report_data, "type": "technician_workload"}
    )


@api_view(["GET"])
@permission_classes(
    [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]
)
@api_view_try_except
def get_payment_methods_report(request):
    """Get payment methods report with custom date range support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    report_data = PredefinedReportGenerator.generate_payment_methods_report(
        date_range, start_date, end_date
    )
    return Response(
        {"success": True, "report": report_data, "type": "payment_methods"}
    )

@api_view(["GET"])
@permission_classes(
    [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]
)

@api_view_try_except
def get_dashboard_data(request):
    """Get data for dashboard widgets (KPI cards, charts)"""
    # KPI Data
    total_active_tasks = Task.objects.exclude(
        status__in=["Ready for Pickup","Picked Up", "Terminated"]
    ).count()

    revenue_this_month = (
        Payment.objects.filter(
            date__month=timezone.now().month, date__year=timezone.now().year
        ).aggregate(total=Sum("amount"))["total"]
        or 0
    )

    tasks_ready_for_pickup = Task.objects.filter(status="Ready for Pickup").count()


    # Average repair time - simplified placeholder
    avg_repair_time = "3.2 days"  # Could be calculated from latest_pickup_at - date_in

    kpi_data = {
        "totalActiveTasks": total_active_tasks,
        "revenueThisMonth": float(revenue_this_month),
        "tasksReadyForPickup": tasks_ready_for_pickup,
    }

    return Response(
        {
            "kpiData": kpi_data,
        }
    )

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
@api_view_try_except
def revenue_overview(request):
    """
    Calculate revenue for this month and today, with comparisons to the previous period.
    """
    report_data = PredefinedReportGenerator.generate_revenue_overview_report()
    return Response(report_data)
 
        
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant])
@api_view_try_except
def get_front_desk_performance(request):
    """Get front desk performance report with custom date range support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    report_data = PredefinedReportGenerator.generate_front_desk_performance_report(
        date_range, start_date, end_date
    )
    return Response({"success": True, "report": report_data, "type": "front_desk_performance"})

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant])
@api_view_try_except
def get_outstanding_payments(request):
    """Get outstanding payments report with date range and pagination support"""
    date_range = request.GET.get("date_range", "last_30_days")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")
    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("page_size", 10))

    search_query = request.GET.get("search")
    pdf_export = request.GET.get("pdf_export") == 'true'

    report_data = PredefinedReportGenerator.generate_outstanding_payments_report(
        date_range, start_date, end_date, page, page_size, search_query, pdf_export
    )
    
    return Response({
        "success": True, 
        "report": report_data, 
        "type": "outstanding_payments"
    })


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant])
@api_view_try_except
def get_print_tasks(request):
    """Get a flat list of tasks for PDF printing, filtered by date range."""
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    if not start_date or not end_date:
        return Response(
            {"success": False, "error": "start_date and end_date are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from reports.generators.base import ReportGeneratorBase

    date_filter, _, duration_days, duration_desc, actual_start, actual_end = (
        ReportGeneratorBase.get_date_filter(
            start_date=start_date, end_date=end_date, field="date_in"
        )
    )

    tasks = (
        Task.objects.filter(date_filter)
        .select_related("customer", "brand", "laptop_model", "current_location", "assigned_to")
        .order_by("-date_in")
    )

    task_list = []
    for t in tasks:
        task_list.append({
            "task_title": t.title,
            "customer_name": t.customer.name if t.customer else "N/A",
            "brand": t.brand.name if t.brand else "N/A",
            "laptop_model": str(t.laptop_model) if t.laptop_model else "N/A",
            "location": t.current_location.name if t.current_location else "N/A",
            "status": t.status or "N/A",
            "workshop_status": t.workshop_status or "N/A",
            "technician": t.assigned_to.get_full_name() if t.assigned_to else "Unassigned",
            "urgency": t.urgency or "N/A",
            "is_debt": t.is_debt,
        })

    return Response({
        "success": True,
        "type": "print_tasks",
        "report": {
            "tasks": task_list,
            "summary": {
                "total_tasks": len(task_list),
                "start_date": str(actual_start),
                "end_date": str(actual_end),
                "duration_days": duration_days,
                "duration_description": duration_desc,
            },
        },
    })