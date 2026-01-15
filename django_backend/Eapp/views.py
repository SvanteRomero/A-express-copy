from django.db.models import Sum, F, DecimalField, Value, Q
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from common.models import Location, Model
from customers.models import Customer, Referrer
from customers.serializers import CustomerSerializer
from financials.serializers import PaymentSerializer, CostBreakdownSerializer
from financials.models import Payment, PaymentMethod, PaymentCategory
from users.permissions import IsAdminOrManagerOrAccountant
from users.models import User
from .models import Task, TaskActivity
from .serializers import TaskListSerializer, TaskDetailSerializer, TaskActivitySerializer
from .filters import TaskFilter
from .pagination import StandardResultsSetPagination
from .utils import CanCreateTask, CanDeleteTask, CanAddPayment, TaskIDGenerator
from customers.services import CustomerHandler
from .services import (
    ActivityLogger,
    WorkshopHandler,
)


class TaskViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Task.objects.all().order_by('-created_at')

        # Annotate total_cost and paid_amount
        queryset = queryset.annotate(
            calculated_total_cost=Coalesce(
                F('estimated_cost'), Value(0, output_field=DecimalField())
            ) + Coalesce(
                Sum('cost_breakdowns__amount', filter=Q(cost_breakdowns__cost_type='Additive')),
                Value(0, output_field=DecimalField())
            ) - Coalesce(
                Sum('cost_breakdowns__amount', filter=Q(cost_breakdowns__cost_type='Subtractive')),
                Value(0, output_field=DecimalField())
            ),
            calculated_paid_amount=Coalesce(Sum('payments__amount'), Value(0, output_field=DecimalField()))
        )

        # Annotate outstanding_balance
        queryset = queryset.annotate(
            outstanding_balance=F('calculated_total_cost') - F('calculated_paid_amount')
        )
        
        # Prefetch related objects to avoid N+1 queries
        if self.action == 'list':
            return queryset.select_related(
                'customer', 'assigned_to', 'laptop_model'
            ).prefetch_related(
                'payments', 'cost_breakdowns'
            )
            
        # For detail view, prefetch all related data
        return queryset.select_related(
            'assigned_to', 'created_by', 'negotiated_by', 'brand', 'referred_by', 'customer', 
            'workshop_location', 'workshop_technician', 'laptop_model'
        ).prefetch_related(
            'activities', 'payments', 'cost_breakdowns'
        )


    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = TaskFilter
    pagination_class = StandardResultsSetPagination
    lookup_field = 'title'
    lookup_url_kwarg = 'task_id'

    @action(detail=False, methods=['get'], url_path='status-options')
    def status_options(self, request):
        return Response(Task.Status.choices)

    @action(detail=False, methods=['get'], url_path='urgency-options')
    def urgency_options(self, request):
        return Response(Task.Urgency.choices)

    def get_serializer_class(self):
        if self.action == 'list':
            return TaskListSerializer
        return TaskDetailSerializer

    def get_object(self):
        queryset = self.get_queryset()
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        obj = get_object_or_404(queryset, **filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj

    def create(self, request, *args, **kwargs):
        if not (request.user.role in ['Manager', 'Front Desk'] or request.user.is_superuser):
            return Response(
                {"error": "You do not have permission to create tasks."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Use service layer for business logic
        from .services import TaskCreationService
        data = request.data.copy()
        processed_data, customer_created, referrer_obj = TaskCreationService.create_task(data, request.user)
        
        # Get customer for later use (notifications)
        customer = None
        if processed_data.get('customer'):
            customer = Customer.objects.get(id=processed_data['customer'])
        
        serializer = self.get_serializer(data=processed_data)
        serializer.is_valid(raise_exception=True)
        
        device_notes = serializer.validated_data.get('device_notes')
        task = serializer.save(created_by=request.user, referred_by=referrer_obj)

        # Create initial activity logs (using service layer)
        TaskCreationService.create_initial_activities(task, request.user, device_notes)

        response_data = self.get_serializer(task).data
        response_data['customer_created'] = customer_created
        
        # Handle notifications (SMS and Toast)
        from .services.notification_handler import TaskNotificationHandler
        sms_result = TaskNotificationHandler.notify_task_created(task, customer)
        
        response_data['sms_sent'] = sms_result['success']
        response_data['sms_phone'] = sms_result['phone']
        
        headers = self.get_success_headers(response_data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        task = self.get_object()
        
        # Use service layer for business logic
        from .services import TaskUpdateService
        
        # Service returns either a Response (error) or a dict with processed data
        result = TaskUpdateService.update_task(task, request.data.copy(), request.user)
        
        if isinstance(result, Response):
            return result
            
        data = result['data']
        referrer_obj = result['referrer_obj']
        original_assigned_to = result['original_assigned_to']

        serializer = self.get_serializer(task, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)

        updated_task = serializer.save(referred_by=referrer_obj)

        # Create activity logs (using service layer)
        TaskUpdateService.create_update_activities(updated_task, data, request.user, original_assigned_to)

        response_data = self.get_serializer(updated_task).data
        
        # Handle notifications (SMS and Toast)
        from .services.notification_handler import TaskNotificationHandler
        
        if data.get('status') == 'Ready for Pickup':
            sms_result = TaskNotificationHandler.notify_ready_for_pickup(updated_task, request.user)
            response_data['sms_sent'] = sms_result['success']
            response_data['sms_phone'] = sms_result['phone']

        elif data.get('status') == 'Picked Up':
            sms_result = TaskNotificationHandler.notify_picked_up(updated_task, request.user)
            response_data['sms_sent'] = sms_result['success']
            response_data['sms_phone'] = sms_result['phone']
            
        # Generic updates (handler has guard clause for status-specific cases)
        TaskNotificationHandler.notify_task_updated(updated_task, data)

        return Response(response_data)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        if not (user.is_superuser or user.role == 'Manager'):
            return Response(
                {"error": "You do not have permission to delete tasks."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrManagerOrAccountant])
    def debts(self, request):
        """
        Returns a list of tasks that are marked as debt.
        """
        tasks = self.get_queryset().filter(is_debt=True)
        page = self.paginate_queryset(tasks)
        if page is not None:
            serializer = TaskListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = TaskListSerializer(tasks, many=True)
        return Response(serializer.data)



    @action(detail=True, methods=['get'])
    def activities(self, request, task_id=None):
        task = self.get_object()
        activities = task.activities.all()
        serializer = TaskActivitySerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='add-activity')
    def add_activity(self, request, task_id=None):
        """Add a new activity to a task."""
        task = self.get_object()
        serializer = TaskActivitySerializer(data=request.data)
        if serializer.is_valid():
            activity = serializer.save(task=task, user=request.user)
            
            # Update snapshots using service layer
            if activity.type == TaskActivity.ActivityType.WORKSHOP:
                WorkshopHandler.update_snapshots_from_activity(task, activity)
            
            if activity.type == TaskActivity.ActivityType.PICKED_UP:
                task.latest_pickup_at = activity.timestamp
                task.latest_pickup_by = activity.user
                task.save(update_fields=['latest_pickup_at', 'latest_pickup_by'])
            
            return Response(TaskActivitySerializer(activity).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def payments(self, request, task_id=None):
        task = self.get_object()
        payments = task.payments.all()
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='add-payment')
    def add_payment(self, request, task_id=None):

        if not (request.user.role in ['Manager', 'Front Desk', 'Accountant'] or request.user.is_superuser):
            return Response(
                {"error": "You do not have permission to add payments."},
                status=status.HTTP_403_FORBIDDEN
            )
        task = self.get_object()
        serializer = PaymentSerializer(data=request.data)
        if serializer.is_valid():
            tech_support_category, _ = PaymentCategory.objects.get_or_create(name='Tech Support')

            payment = serializer.save(task=task, description=f"{task.customer.name} - {task.title}", category=tech_support_category)
            
            # Handle notification
            from .services.notification_handler import TaskNotificationHandler
            TaskNotificationHandler.notify_payment_added(task, payment)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



    @action(detail=True, methods=['post'], url_path='cost-breakdowns')
    def cost_breakdowns(self, request, task_id=None):
        task = self.get_object()
        serializer = CostBreakdownSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(task=task)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ModelViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.values_list('laptop_model', flat=True).distinct()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        # Ensure no None or empty strings are returned
        return Response([model for model in queryset if model])

