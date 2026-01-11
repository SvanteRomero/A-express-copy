from django.db.models import Sum, F, DecimalField, Value, Q
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from common.models import Location, Model
from customers.models import Customer, Referrer
from customers.serializers import CustomerSerializer
from financials.serializers import PaymentSerializer, CostBreakdownSerializer
from financials.models import Payment, PaymentMethod, PaymentCategory
from messaging.models import MessageLog
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
        data = request.data.copy()
        data['title'] = TaskIDGenerator.generate()

        # Customer creation/retrieval logic (using service layer)
        customer_data = data.pop('customer', None)
        customer, customer_created = CustomerHandler.create_or_update_customer(customer_data)
        if customer:
            data['customer'] = customer.id
        
        # Laptop Model creation/retrieval logic
        laptop_model_name = data.pop('laptop_model', None)
        brand_id = data.get('brand', None)
        if laptop_model_name and brand_id:
            model, _ = Model.objects.get_or_create(name=laptop_model_name, brand_id=brand_id)
            data['laptop_model'] = model.id

        # --- Business logic moved from serializer ---
        referred_by_name = data.pop("referred_by", None)
        is_referred = data.get("is_referred", False)

        if data.get("assigned_to"):
            data["status"] = "In Progress"
        else:
            data["status"] = "Pending"

        if 'estimated_cost' in data:
            data['total_cost'] = data['estimated_cost']
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        referrer_obj = None
        if is_referred and referred_by_name:
            referrer_obj, _ = Referrer.objects.get_or_create(name=referred_by_name)

        device_notes = serializer.validated_data.get('device_notes')
        task = serializer.save(created_by=request.user, referred_by=referrer_obj)

        # Create initial activity logs (using service layer)
        ActivityLogger.log_intake(task, request.user)
        if device_notes:
            ActivityLogger.log_device_note(task, request.user, device_notes)
        if task.assigned_to:
            ActivityLogger.log_assignment(task, request.user, None, task.assigned_to)

        response_data = self.get_serializer(task).data
        response_data['customer_created'] = customer_created
        
        # Send task registration SMS if enabled
        response_data['sms_sent'] = False
        response_data['sms_phone'] = None
        
        try:
            from settings.models import SystemSettings
            from messaging.services import send_task_registration_sms
            from common.encryption import decrypt_value
            
            system_settings = SystemSettings.get_settings()
            if system_settings.auto_sms_on_task_creation and customer:
                # Refresh customer from database to ensure phone_numbers relationship is loaded
                # (fixes caching issue where newly created phone numbers aren't visible)
                customer.refresh_from_db()
                # Get customer's primary phone number
                primary_phone = customer.phone_numbers.first()
                if primary_phone:
                    # Decrypt phone number (encrypted in PostgreSQL production)
                    phone_number = decrypt_value(primary_phone.phone_number)
                    sms_result = send_task_registration_sms(task, phone_number, request.user)
                    response_data['sms_sent'] = sms_result.get('success', False)
                    response_data['sms_phone'] = sms_result.get('phone')
        except Exception as e:
            # Don't fail task creation if SMS fails
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending task registration SMS: {e}")
        
        headers = self.get_success_headers(response_data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        task = self.get_object()
        user = request.user
        data = request.data.copy()

        # Handle customer update (using service layer)
        customer_data = data.pop('customer', None)
        if customer_data:
            CustomerHandler.update_customer(task.customer, customer_data)
        
        partial_payment_amount = data.pop("partial_payment_amount", None)
        if partial_payment_amount is not None:
            payment_method, _ = PaymentMethod.objects.get_or_create(name="Partial Payment")
            Payment.objects.create(task=task, amount=partial_payment_amount, method=payment_method)

        referred_by_name = data.pop("referred_by", None)
        is_referred = data.get("is_referred", task.is_referred)

        # --- Apply business logic before validation ---
        if "assigned_to" in data:
            if data["assigned_to"]:
                data["status"] = "In Progress"
            else:
                data["status"] = "Pending"
        
        
        # Handle workshop operations (using service layer)
        if 'workshop_location' in data and 'workshop_technician' in data:
            WorkshopHandler.send_to_workshop(task, data.get('workshop_location'), data.get('workshop_technician'), user)
        
        if data.get('workshop_status') in ['Solved', 'Not Solved']:
            WorkshopHandler.return_from_workshop(task, data['workshop_status'], user)

        # Handle status transitions
        if 'status' in data:
            response = self._handle_status_update(data, task, user)
            if response:
                return response

        serializer = self.get_serializer(task, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)

        # --- Save with extra data ---
        referrer_obj = task.referred_by
        if is_referred:
            if referred_by_name:
                referrer_obj, _ = Referrer.objects.get_or_create(name=referred_by_name)
        else:
            referrer_obj = None
        
        updated_task = serializer.save(referred_by=referrer_obj)

        # --- Side effects after saving ---
        self._create_update_activities(updated_task, data, user, original_task=task)

        response_data = self.get_serializer(updated_task).data
        
        # Send SMS notification when approved (Ready for Pickup)
        if data.get('status') == 'Ready for Pickup':
            response_data['sms_sent'] = False
            response_data['sms_phone'] = None
            try:
                from messaging.services import send_ready_for_pickup_sms
                from common.encryption import decrypt_value
                # Refresh task and customer to ensure phone_numbers are loaded
                updated_task.refresh_from_db()
                customer = updated_task.customer
                if customer:
                    customer.refresh_from_db()
                    if customer.phone_numbers.exists():
                        primary_phone = customer.phone_numbers.first()
                        # Decrypt phone number (encrypted in PostgreSQL production)
                        phone_number = decrypt_value(primary_phone.phone_number)
                        sms_result = send_ready_for_pickup_sms(updated_task, phone_number, user)
                        response_data['sms_sent'] = sms_result.get('success', False)
                        response_data['sms_phone'] = sms_result.get('phone')
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error sending ready for pickup SMS: {e}")

        # Send SMS notification when picked up (thank you or debt reminder)
        if data.get('status') == 'Picked Up':
            response_data['sms_sent'] = False
            response_data['sms_phone'] = None
            try:
                from messaging.services import send_picked_up_sms
                from common.encryption import decrypt_value
                # Refresh task and customer to ensure phone_numbers are loaded
                updated_task.refresh_from_db()
                customer = updated_task.customer
                if customer:
                    customer.refresh_from_db()
                    if customer.phone_numbers.exists():
                        primary_phone = customer.phone_numbers.first()
                        # Decrypt phone number (encrypted in PostgreSQL production)
                        phone_number = decrypt_value(primary_phone.phone_number)
                        sms_result = send_picked_up_sms(updated_task, phone_number, user)
                        response_data['sms_sent'] = sms_result.get('success', False)
                        response_data['sms_phone'] = sms_result.get('phone')
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error sending picked up SMS: {e}")

        return Response(response_data)

    def _create_update_activities(self, task, data, user, original_task):
        """Create activity logs for task updates using service layer."""
        # Log debt marking
        if data.get('is_debt') is True:
            ActivityLogger.log_debt_marking(task, user)

        # Note: Workshop activities are already logged by WorkshopHandler
        # Assignment activities are logged below

        # Log assignment changes
        if 'assigned_to' in data:
            new_technician_id = data.get('assigned_to')
            
            if new_technician_id:
                new_technician = get_object_or_404(User, id=new_technician_id)
                if original_task.assigned_to != new_technician:
                    ActivityLogger.log_assignment(task, user, original_task.assigned_to, new_technician)
            else:
                if original_task.assigned_to:
                    ActivityLogger.log_assignment(task, user, original_task.assigned_to, None)



    def _handle_status_update(self, data, task, user):
        """Handle status transitions with permission checks and activity logging."""
        from Eapp.utils.status_transitions import can_transition
        
        new_status = data['status']
        if not can_transition(user, task, new_status):
            return Response(
                {"error": f"As a {user.role}, you cannot change status from '{task.status}' to '{new_status}'."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Handle rejection (using service layer)
        if new_status == 'In Progress' and 'qc_notes' in data and data['qc_notes']:
            ActivityLogger.log_rejection(task, user, data['qc_notes'])
            return None  # Prevent other status update logs

        # Log standard status changes (using service layer)
        ActivityLogger.log_status_change(task, user, new_status)

        # Handle returned task assignment
        if new_status == 'In Progress' and user.role == 'Front Desk':
            technician_id = data.get('assigned_to')
            if technician_id:
                technician = get_object_or_404(User, id=technician_id, role='Technician')
                task.assigned_to = technician
                ActivityLogger.log_returned_task_assignment(task, user, technician)
        
        return None

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

            serializer.save(task=task, description=f"{task.customer.name} - {task.title}", category=tech_support_category)
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

class DashboardStats(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        now = timezone.now()
        
        # 1. New Tasks Created Today
        new_tasks_count = Task.objects.filter(created_at__date=today).count()
        
        # 2. Messages Sent Today
        messages_sent_count = MessageLog.objects.filter(sent_at__date=today, status='sent').count()
        
        # 3. Tasks Ready for Pickup
        tasks_ready_for_pickup_count = Task.objects.filter(status=Task.Status.READY_FOR_PICKUP).count()

        # 4. Total Active Tasks (excluding closed states)
        # Using logic from reports/views.py: exclude Ready for Pickup, Picked Up, Terminated AND Completed?
        # reports/views.py excluded ["Ready for Pickup","Picked Up", "Terminated"]. "Completed" might be a valid active state in some contexts 
        # but usually Completed means done. Let's add Completed to exclude list to be safe or stick to reports logic.
        # reports logic: exclude(status__in=["Ready for Pickup","Picked Up", "Terminated"])
        # Wait, if I stick to reports logic exactly:
        total_active_tasks_count = Task.objects.exclude(
            status__in=["Ready for Pickup", "Picked Up", "Terminated", "Completed"]
        ).count()

        # 5. Revenue This Month
        revenue_this_month = (
            Payment.objects.filter(
                date__month=now.month, date__year=now.year
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )
        
        data = {
            "new_tasks_count": new_tasks_count,
            "messages_sent_count": messages_sent_count,
            "tasks_ready_for_pickup_count": tasks_ready_for_pickup_count,
            "active_tasks_count": total_active_tasks_count,
            "revenue_this_month": float(revenue_this_month),
        }
        return Response(data)