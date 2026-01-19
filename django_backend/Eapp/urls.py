from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import dashboard_views

router = DefaultRouter()
router.register(r'tasks', views.TaskViewSet, basename='task')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard-stats/', dashboard_views.DashboardStats.as_view(), name='dashboard-stats'),
]

