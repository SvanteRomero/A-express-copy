from django.urls import path
from . import views

urlpatterns = [
    path('tasks/<int:task_id>/send-sms/', views.send_customer_sms, name='send-customer-sms'),
]
