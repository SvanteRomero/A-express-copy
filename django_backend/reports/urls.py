from django.urls import path
from . import views

urlpatterns = [
    path('revenue-overview/', views.revenue_overview, name='revenue_overview'),
]
