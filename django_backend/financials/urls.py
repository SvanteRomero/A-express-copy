from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'accounts', views.AccountViewSet, basename='account')
router.register(r'payment-methods', views.PaymentMethodViewSet)
router.register(r'payment-categories', views.PaymentCategoryViewSet, basename='payment-category')
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'expenditure-requests', views.ExpenditureRequestViewSet, basename='expenditure-request')
router.register(r'cost-breakdowns', views.CostBreakdownViewSet, basename='cost-breakdown')

urlpatterns = [
    path('', include(router.urls)),
]
