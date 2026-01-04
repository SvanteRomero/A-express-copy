from django.db.models import Sum, F, DecimalField, Value, Q
from django.db.models.functions import Coalesce
from common.models import Location, Model
from customers.serializers import CustomerSerializer
from rest_framework import status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import render
from django.utils import timezone
from requests.exceptions import RequestException
from financials.serializers import PaymentSerializer, CostBreakdownSerializer
from .models import Task, TaskActivity
from .serializers import (
    TaskListSerializer, TaskDetailSerializer, TaskActivitySerializer
)
from financials.models import Payment, PaymentMethod, PaymentCategory
from django.shortcuts import get_object_or_404
from users.permissions import IsAdminOrManagerOrAccountant
from .status_transitions import can_transition
from django_filters.rest_framework import DjangoFilterBackend
from .filters import TaskFilter
from .pagination import StandardResultsSetPagination
from customers.models import Customer, Referrer
from rest_framework.views import APIView
from messaging.models import MessageLog


def generate_task_id():
    now = timezone.now()
    
    # Determine the year character
    first_task = Task.objects.order_by('created_at').first()
    if first_task:
        first_year = first_task.created_at.year
        year_char = chr(ord('A') + now.year - first_year)
    else:
        year_char = 'A'

    # Format the prefix for the current month
    month_prefix = f"{year_char}{now.month}"

    # Find the last task created this month to determine the next sequence number
    last_task = Task.objects.filter(title__startswith=month_prefix).order_by('-title').first()

    if last_task:
        # Extract the sequence number from the last task\'s title
        last_seq = int(last_task.title.split('-')[-1])
        new_seq = last_seq + 1
    else:
        # Start a new sequence for the month
        new_seq = 1

    return f"{month_prefix}-{new_seq:03d}"

class TaskViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Task.objects.all()

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
        data['title'] = generate_task_id()

        # Customer creation/retrieval logic
        customer_data = data.pop('customer', None)
        customer_created = False
        if customer_data:
            phone_numbers = customer_data.get('phone_numbers', [])
            customer = None
            if phone_numbers:
                first_phone_number = phone_numbers[0].get('phone_number')
                if first_phone_number:
                    try:
                        customer = Customer.objects.get(phone_numbers__phone_number=first_phone_number)
                    except Customer.DoesNotExist:
                        pass  # Customer not found, will be created

            if customer:
                data['customer'] = customer.id
            else:
                customer_serializer = CustomerSerializer(data=customer_data)
                customer_serializer.is_valid(raise_exception=True)
                customer = customer_serializer.save()
                data['customer'] = customer.id
                customer_created = True
        
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

        # --- Side effects after saving ---
        TaskActivity.objects.create(
            task=task, user=task.created_by, type=TaskActivity.ActivityType.INTAKE, message="Task has been taken in."
        )
        if device_notes:
            TaskActivity.objects.create(
                task=task, user=task.created_by, type=TaskActivity.ActivityType.DEVICE_NOTE, message=f"Device Notes: {device_notes}"
            )

        if task.assigned_to:
            TaskActivity.objects.create(
                task=task,
                user=task.created_by,
                type=TaskActivity.ActivityType.ASSIGNMENT,
                message=f"Task assigned to {task.assigned_to.get_full_name()} by {task.created_by.get_full_name()}."
            )

        response_data = self.get_serializer(task).data
        response_data['customer_created'] = customer_created
        
        headers = self.get_success_headers(response_data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        task = self.get_object()
        user = request.user
        data = request.data.copy()

        # --- Pop and handle data before validation ---
        self._handle_customer_update(data.pop('customer', None), task)
        
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
        
        self._handle_payment_status_update(data, task, user)
        self._handle_workshop_instance_update(data, task, user)

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

        return Response(self.get_serializer(updated_task).data)

    def _create_update_activities(self, task, data, user, original_task):
        if data.get('is_debt') is True:
            TaskActivity.objects.create(
                task=task, user=user, type=TaskActivity.ActivityType.STATUS_UPDATE, message="Task marked as debt."
            )

        if 'workshop_location' in data and 'workshop_technician' in data:
            workshop_technician = get_object_or_404(User, id=data.get('workshop_technician'))
            workshop_location = get_object_or_404(Location, id=data.get('workshop_location'))
            # Include structured metadata in activity details for robust parsing
            details = {
                'workshop_technician_id': workshop_technician.id,
                'workshop_technician_name': workshop_technician.get_full_name(),
                'workshop_location_id': workshop_location.id,
                'workshop_location_name': workshop_location.name,
            }
            TaskActivity.objects.create(
                task=task, user=user, type=TaskActivity.ActivityType.WORKSHOP,
                message=f"Task sent to workshop technician {workshop_technician.get_full_name()} at {workshop_location.name}.",
                details=details,
            )
            # Populate snapshot fields (first send) for performance and data-proofing
            if not task.original_technician_snapshot:
                task.original_technician_snapshot = user
            if not task.original_location_snapshot:
                task.original_location_snapshot = workshop_location.name
            # Ensure workshop_location/technician are set (may be set earlier)
            task.workshop_location = workshop_location
            task.workshop_technician = workshop_technician
            task.current_location = workshop_location.name
            task.save(update_fields=['original_technician_snapshot', 'original_location_snapshot', 'workshop_location', 'workshop_technician', 'current_location'])

        if data.get('workshop_status') in ['Solved', 'Not Solved']:
            details = {'workshop_status': data.get('workshop_status')}
            TaskActivity.objects.create(
                task=task, user=user, type=TaskActivity.ActivityType.WORKSHOP,
                message=f"Task returned from workshop with status: {data['workshop_status']}.",
                details=details,
            )

        if 'assigned_to' in data:
            new_technician_id = data.get('assigned_to')
            if new_technician_id:
                new_technician = get_object_or_404(User, id=new_technician_id)
                if original_task.assigned_to != new_technician:
                    old_technician_name = original_task.assigned_to.get_full_name() if original_task.assigned_to else "unassigned"
                    TaskActivity.objects.create(
                        task=task, user=user, type=TaskActivity.ActivityType.ASSIGNMENT,
                        message=f"Task reassigned from {old_technician_name} to {new_technician.get_full_name()} by {user.get_full_name()}."
                    )
            else:
                if original_task.assigned_to:
                    old_technician_name = original_task.assigned_to.get_full_name()
                    TaskActivity.objects.create(
                        task=task, user=user, type=TaskActivity.ActivityType.ASSIGNMENT,
                        message=f"Task unassigned from {old_technician_name} by {user.get_full_name()}."
                    )

    def _handle_customer_update(self, customer_data, task):
        if customer_data:
            customer_serializer = CustomerSerializer(task.customer, data=customer_data, partial=True)
            customer_serializer.is_valid(raise_exception=True)
            customer_serializer.save()

    def _handle_payment_status_update(self, data, task, user):
        if user.role == 'Accountant' and 'payment_status' in data:
            task.payment_status = data['payment_status']
            # keep payment_status change; rely on Payment records and signals
            # to maintain paid_date if needed
            task.save()

    def _handle_workshop_instance_update(self, data, task, user):
        if 'workshop_location' in data and 'workshop_technician' in data:
            task.workshop_status = 'In Workshop'
            workshop_location = get_object_or_404(Location, id=data.get('workshop_location'))
            task.workshop_location = workshop_location
            task.workshop_technician = get_object_or_404(User, id=data.get('workshop_technician'))
            task.current_location = workshop_location.name

        if data.get('workshop_status') in ['Solved', 'Not Solved']:
            # On return, restore assignment from the workshop activity if available
            if task.original_technician:
                task.assigned_to = task.original_technician
            task.workshop_location = None
            task.workshop_technician = None
            task.workshop_status = None

    def _handle_status_update(self, data, task, user):
        new_status = data['status']
        if not can_transition(user, task, new_status):
            return Response(
                {"error": f"As a {user.role}, you cannot change status from '{task.status}' to '{new_status}'."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Handle rejection
        if new_status == 'In Progress' and 'qc_notes' in data and data['qc_notes']:
            TaskActivity.objects.create(
                task=task,
                user=user,
                type=TaskActivity.ActivityType.REJECTED,
                message=f"Task rejected by {user.get_full_name()} with notes: {data['qc_notes']}"
            )
            return None # Prevent other status update logs for this case

        # Create activity logs for specific transitions
        activity_messages = {
            'Picked Up': "Task has been picked up by the customer.",
            'Completed': "Task marked as Completed.",
            'Ready for Pickup': "Task has been approved and is ready for pickup."
        }
        if new_status in activity_messages:
            activity_type = TaskActivity.ActivityType.STATUS_UPDATE
            if new_status == 'Picked Up':
                activity_type = TaskActivity.ActivityType.PICKED_UP
                # record structured pickup metadata and snapshot latest pickup
                pickup_time = timezone.now()
                details = {'pickup_by_id': user.id, 'pickup_by_name': user.get_full_name(), 'pickup_at': pickup_time.isoformat()}
                task.latest_pickup_at = pickup_time
                task.latest_pickup_by = user
                task.save(update_fields=['latest_pickup_at', 'latest_pickup_by'])
            elif new_status == 'Ready for Pickup':
                activity_type = TaskActivity.ActivityType.READY
            TaskActivity.objects.create(task=task, user=user, type=activity_type, message=activity_messages[new_status], details=(details if 'details' in locals() else None))

        if new_status == 'In Progress' and user.role == 'Front Desk':
            technician_id = data.get('assigned_to')
            if technician_id:
                technician = get_object_or_404(User, id=technician_id, role='Technician')
                task.assigned_to = technician
                TaskActivity.objects.create(
                    task=task, user=user, type=TaskActivity.ActivityType.ASSIGNMENT,
                    message=f"Returned task assigned to {technician.get_full_name()}."
                )
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
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)



    @action(detail=True, methods=['get'])
    def activities(self, request, task_id=None):
        task = self.get_object()
        activities = task.activities.all()
        serializer = TaskActivitySerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='add-activity')
    def add_activity(self, request, task_id=None):
        task = self.get_object()
        serializer = TaskActivitySerializer(data=request.data)
        if serializer.is_valid():
            activity = serializer.save(task=task, user=request.user)
            # If activity contains structured details, update Task snapshots for performance
            if activity.type == TaskActivity.ActivityType.WORKSHOP:
                details = activity.details or {}
                # set original snapshots if missing
                if not task.original_technician_snapshot:
                    task.original_technician_snapshot = activity.user
                if not task.original_location_snapshot and details.get('workshop_location_name'):
                    task.original_location_snapshot = details.get('workshop_location_name')
                task.save(update_fields=['original_technician_snapshot', 'original_location_snapshot'])
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
                status=status.HTTP_4_FORBIDDEN
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

class TechnicianDashboardStats(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        
        # 1. Assigned Tasks (Pending)
        assigned_count = Task.objects.filter(assigned_to=user, status="Pending").count()
        
        # 2. In Progress Tasks
        in_progress_count = Task.objects.filter(assigned_to=user, status="In Progress").count()
        
        # 3. Completed Today
        completed_today_count = Task.objects.filter(
            assigned_to=user,
            status="Completed",
            updated_at__date=today
        ).count()
        
        # 4. Urgent Tasks (Active + Yupo/Ina Haraka)
        # Active means not Completed, Picked Up, Terminated or Ready for Pickup?
        # User defined High Priority as "Yupo" and "Ina Haraka".
        # Assuming we only care about active urgent tasks.
        urgent_count = Task.objects.filter(
            assigned_to=user,
            urgency__in=["Yupo", "Ina Haraka"]
        ).exclude(
             status__in=["Completed", "Picked Up", "Terminated", "Ready for Pickup"]
        ).count()

        # 5. Recent Activity (Last 5 updated tasks for this user)
        recent_tasks_qs = Task.objects.filter(assigned_to=user).order_by('-updated_at')[:5]
        recent_tasks_data = []
        for t in recent_tasks_qs:
             recent_tasks_data.append({
                 "id": t.title, # using title as ID for display
                 "title": t.title,
                 "laptop_model_name": t.laptop_model.name if t.laptop_model else "Device",
                 "status": t.status
             })

        data = {
            "assigned_count": assigned_count,
            "in_progress_count": in_progress_count,
            "completed_today_count": completed_today_count,
            "urgent_count": urgent_count,
            "recent_tasks": recent_tasks_data
        }
        return Response(data)

class AccountantDashboardStats(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        
        # 1. Today's Revenue (Sum of payments made today)
        todays_revenue = (
            Payment.objects.filter(
                date=today
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )
        
        # 2. Outstanding Payments (Sum of outstanding balance for all tasks)
        outstanding_payments_total = (
            Task.objects.aggregate(
                total=Sum(F("total_cost") - F("paid_amount"))
            )["total"] 
            or 0
        )

        # 3. Tasks Pending Payment (Count of tasks with payment status 'Unpaid' or 'Partially Paid')
        pending_payment_count = Task.objects.filter(
            payment_status__in=['Unpaid', 'Partially Paid']
        ).count()

        data = {
            "todays_revenue": float(todays_revenue),
            "outstanding_payments_total": float(outstanding_payments_total),
            "pending_payment_count": pending_payment_count,
        }
        return Response(data)
