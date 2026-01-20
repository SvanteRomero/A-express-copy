from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"accounts", views.AccountViewSet, basename="account")
router.register(r"payment-methods", views.PaymentMethodViewSet)
router.register(
    r"payment-categories", views.PaymentCategoryViewSet, basename="payment-category"
)
router.register(r"payments", views.PaymentViewSet, basename="payment")
# New unified endpoint
router.register(
    r"transaction-requests",
    views.TransactionRequestViewSet,
    basename="transaction-request",
)
# Backwards compatibility - same viewset, different URL
router.register(
    r"expenditure-requests",
    views.TransactionRequestViewSet,
    basename="expenditure-request",
)
router.register(
    r"cost-breakdowns", views.CostBreakdownViewSet, basename="cost-breakdown"
)

urlpatterns = [
    path("", include(router.urls)),
    path(
        "financial-summary/",
        views.FinancialSummaryView.as_view(),
        name="financial-summary",
    ),
    # Accountant Dashboard Stats
    path(
        "accountant-dashboard-stats/",
        views.AccountantDashboardStats.as_view(),
        name="accountant-dashboard-stats",
    ),
]
