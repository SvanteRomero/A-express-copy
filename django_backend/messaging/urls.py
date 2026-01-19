from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'templates', views.MessageTemplateViewSet)
router.register(r'history', views.MessageLogViewSet)


urlpatterns = [
    path('', include(router.urls)),
    path('tasks/<int:task_id>/send-sms/', views.send_customer_sms, name='send-customer-sms'),
    path('tasks/<int:task_id>/send-debt-reminder/', views.send_debt_reminder, name='send-debt-reminder'),
    path('tasks/<int:task_id>/preview-message/', views.preview_template_message, name='preview-template-message'),
    path('bulk-send/', views.bulk_send_sms, name='bulk-send-sms'),
    path('scheduler-notifications/', views.get_scheduler_notifications, name='scheduler-notifications'),
    path('scheduler-notifications/<int:pk>/acknowledge/', views.acknowledge_scheduler_notification, name='acknowledge-scheduler-notification'),
]


