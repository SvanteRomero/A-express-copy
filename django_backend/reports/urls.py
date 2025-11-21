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
    path("reports/revenue-summary/", views.get_revenue_summary, name="revenue_summary"),
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
        "reports/custom/generate/",
        views.generate_custom_report,
        name="generate_custom_report",
    ),
    path(
        "reports/laptops-in-shop/",
        views.get_laptops_in_shop_by_location,
        name="laptops_in_shop_by_location",
    ),
]
