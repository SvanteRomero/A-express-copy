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
from financials.models import Payment, PaymentMethod, PaymentCategory, CostBreakdown
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
        import logging
        logger = logging.getLogger(__name__)
        
        logger.warning(f"[QUERYSET DEBUG] Action: {self.action}, Method: {self.request.method if hasattr(self, 'request') else 'NO REQUEST'}")
        
        queryset = Task.objects.all().order_by('-created_at')

        # Only add annotations for list and retrieve actions
        # Skip for update/partial_update to avoid potential query issues
        if self.action in ['list', 'retrieve', None]:
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
        elif self.action in ['retrieve', 'update', 'partial_update', None]:
            # For detail view and updates, prefetch all related data
            return queryset.select_related(
                'assigned_to', 'created_by', 'negotiated_by', 'brand', 'referred_by', 'customer', 
                'workshop_location', 'laptop_model'
            ).prefetch_related(
                'activities', 'payments', 'cost_breakdowns'
            )
        
        return queryset


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
        import logging
        logger = logging.getLogger(__name__)
        
        queryset = self.get_queryset()
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        
        # Debug logging
        logger.warning(f"[TASK DEBUG] User: {self.request.user.username} (Role: {self.request.user.role})")
        logger.warning(f"[TASK DEBUG] Action: {self.action}, Method: {self.request.method}")
        logger.warning(f"[TASK DEBUG] Looking up task: {filter_kwargs}")
        logger.warning(f"[TASK DEBUG] Queryset count: {queryset.count()}")
        
        try:
            obj = get_object_or_404(queryset, **filter_kwargs)
            logger.warning(f"[TASK DEBUG] Task found: {obj.title}, Status: {obj.status}")
            self.check_object_permissions(self.request, obj)
            return obj
        except Exception as e:
            logger.error(f"[TASK DEBUG] Error getting object: {type(e).__name__}: {str(e)}")
            raise

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

        # Broadcast update for live list refresh
        TaskNotificationHandler.broadcast_task_update(task)
        
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

        elif data.get('status') == 'Completed':
            TaskNotificationHandler.notify_task_completed(updated_task, request.user)
            
        else:
            # Generic updates (only if not covered by a status-specific handler above)
            TaskNotificationHandler.notify_task_updated(updated_task, data, request.user)

        # Notify workshop technicians when task is assigned to workshop
        if data.get('workshop_location'):
            TaskNotificationHandler.notify_sent_to_workshop(
                updated_task, 
                request.user
            )

        # Notify original technician when workshop marks task as Solved/Not Solved
        if data.get('workshop_status') in ['Solved', 'Not Solved']:
            TaskNotificationHandler.notify_workshop_status_changed(
                updated_task,
                data.get('workshop_status'),
                request.user
            )

        # Broadcast task update for live cross-user cache invalidation
        TaskNotificationHandler.broadcast_task_update(updated_task, list(data.keys()))

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
        Returns a list of tasks that are marked as debt and not terminated.
        """
        tasks = self.get_queryset().filter(is_debt=True).exclude(status='Terminated')
        page = self.paginate_queryset(tasks)
        if page is not None:
            serializer = TaskListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = TaskListSerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='request-debt')
    def request_debt(self, request, task_id=None):
        """
        Front Desk/Accountant requests debt marking.
        Broadcasts an interactive approval toast to all managers.
        """
        user = request.user
        if user.role not in ['Front Desk', 'Accountant']:
            return Response(
                {"error": "Only Front Desk and Accountant can request debt marking."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task = self.get_object()
        
        # Validate task state
        if task.payment_status == 'Fully Paid':
            return Response(
                {"error": "Cannot request debt for fully paid task."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if task.is_debt:
            return Response(
                {"error": "Task is already marked as debt."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Broadcast to managers
        from .broadcasts import broadcast_debt_request
        request_id = broadcast_debt_request(task, user)
        
        if request_id:
            return Response({'status': 'request_sent', 'request_id': request_id})
        return Response(
            {"error": "Failed to send debt request."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    @action(detail=True, methods=['post'], url_path='approve-debt')
    def approve_debt(self, request, task_id=None):
        """
        Manager approves a debt request.
        Marks the task as debt, logs activity, and dismisses all manager toasts.
        """
        user = request.user
        if user.role != 'Manager' and not user.is_superuser:
            return Response(
                {"error": "Only Managers can approve debt requests."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task = self.get_object()
        requester_id = request.data.get('requester_id')
        request_id = request.data.get('request_id')
        requester_name = request.data.get('requester_name', 'Unknown')
        
        if not request_id:
            return Response(
                {"error": "request_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark task as debt
        task.is_debt = True
        task.save(update_fields=['is_debt'])
        
        # Log activity
        ActivityLogger.log_debt_marking(
            task, 
            user, 
            f"Debt requested by {requester_name}, approved by {user.get_full_name() or user.username}"
        )
        
        # Dismiss toast for all managers and notify requester
        from .broadcasts import broadcast_debt_resolved
        broadcast_debt_resolved(task, approved=True, approver=user, requester_id=requester_id, request_id=request_id)
        
        # Broadcast task update for live cache invalidation
        from .services.notification_handler import TaskNotificationHandler
        TaskNotificationHandler.broadcast_task_update(task, ['is_debt'])
        
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'], url_path='reject-debt')
    def reject_debt(self, request, task_id=None):
        """
        Manager rejects a debt request.
        Dismisses all manager toasts and notifies the requester.
        """
        user = request.user
        if user.role != 'Manager' and not user.is_superuser:
            return Response(
                {"error": "Only Managers can reject debt requests."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        task = self.get_object()
        requester_id = request.data.get('requester_id')
        request_id = request.data.get('request_id')
        
        if not request_id:
            return Response(
                {"error": "request_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Dismiss toast for all managers and notify requester
        from .broadcasts import broadcast_debt_resolved
        broadcast_debt_resolved(task, approved=False, approver=user, requester_id=requester_id, request_id=request_id)
        
        return Response({'status': 'rejected'})



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
            tech_support_category, _ = PaymentCategory.objects.get_or_create(name='TECH SUPPORT')

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

    @action(detail=True, methods=['delete'], url_path='cost-breakdowns/(?P<breakdown_id>[^/.]+)')
    def delete_cost_breakdown(self, request, task_id=None, breakdown_id=None):
        """Delete a specific cost breakdown item for a task."""
        task = self.get_object()
        
        # Get the cost breakdown and ensure it belongs to this task
        cost_breakdown = get_object_or_404(CostBreakdown, id=breakdown_id, task=task)
        
        # Store details for logging before deletion
        description = cost_breakdown.description
        amount = cost_breakdown.amount
        
        # Delete the cost breakdown
        cost_breakdown.delete()
        
        # Log the activity
        ActivityLogger.log_cost_breakdown_delete(
            task=task,
            user=request.user,
            description=description,
            amount=amount
        )
        
        # Broadcast task update for live cache invalidation
        from .services.notification_handler import TaskNotificationHandler
        TaskNotificationHandler.broadcast_task_update(task, ['cost_breakdowns'])
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class ModelViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.values_list('laptop_model', flat=True).distinct()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        # Ensure no None or empty strings are returned
        return Response([model for model in queryset if model])

