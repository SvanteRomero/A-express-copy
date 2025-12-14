from django.urls import path
from . import views

urlpatterns = [
    path(
        "reports/generate/", views.generate_custom_report, name="generate_custom_report"
    ),
    path(
        "reports/field-options/",
        views.get_report_field_options,
        name="get_report_field_options",
    ),
    path("revenue-overview/", views.revenue_overview, name="revenue_overview"),
    path(
        "reports/outstanding-payments/",
        views.get_outstanding_payments,
        name="outstanding_payments",
    ),
    path(
        "reports/task-status/", views.get_task_status_report, name="task_status_report"
    ),
    path(
        "reports/technician-performance/",
        views.get_technician_performance,
        name="technician_performance",
    ),
    path("reports/turnaround-time/", views.get_turnaround_time, name="turnaround_time"),
    path(
        "reports/technician-workload/",
        views.get_technician_workload,
        name="technician_workload",
    ),
    path(
        "reports/payment-methods/",
        views.get_payment_methods_report,
        name="payment_methods_report",
    ),
    path(
        "reports/front-desk-performance/",
        views.get_front_desk_performance,
        name="front_desk_performance",
    ),
    path(
        "reports/custom/generate/",
        views.generate_custom_report,
        name="generate_custom_report",
    ),
    path(
        "reports/dashboard-data/",
        views.get_dashboard_data,
        name="dashboard_data",
    ),
]
