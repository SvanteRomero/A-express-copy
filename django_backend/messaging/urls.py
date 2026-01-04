from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'templates', views.MessageTemplateViewSet)
router.register(r'history', views.MessageLogViewSet)


urlpatterns = [
    path('', include(router.urls)),
    path('tasks/<int:task_id>/send-sms/', views.send_customer_sms, name='send-customer-sms'),
    path('bulk-send/', views.bulk_send_sms, name='bulk-send-sms'),
]
