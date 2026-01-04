from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'tasks', views.TaskViewSet, basename='task')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard-stats/', views.DashboardStats.as_view(), name='dashboard-stats'),
    path('technician-dashboard-stats/', views.TechnicianDashboardStats.as_view(), name='technician-dashboard-stats'),
    path('accountant-dashboard-stats/', views.AccountantDashboardStats.as_view(), name='accountant-dashboard-stats'),
]
