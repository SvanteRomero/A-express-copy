from common.models import Location
from customers.serializers import CustomerSerializer
from rest_framework import status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from users.models import User
from financials.serializers import PaymentSerializer, CostBreakdownSerializer
from .models import Task, TaskActivity
from .serializers import (
    TaskListSerializer, TaskDetailSerializer, TaskActivitySerializer
)
from financials.models import PaymentCategory
from django.shortcuts import get_object_or_404
from users.permissions import IsAdminOrManagerOrAccountant
from .status_transitions import can_transition
from django_filters.rest_framework import DjangoFilterBackend
from .filters import TaskFilter
from .pagination import StandardResultsSetPagination
from customers.models import Customer




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
        
        # Prefetch related objects to avoid N+1 queries
        if self.action == 'list':
            return queryset.select_related(
                'customer', 'assigned_to'
            ).prefetch_related(
                'payments', 'cost_breakdowns'
            )
            
        # For detail view, prefetch all related data
        return queryset.select_related(
            'assigned_to', 'created_by', 'negotiated_by', 'approved_by', 
            'sent_out_by', 'brand', 'referred_by', 'customer', 
            'workshop_location', 'workshop_technician', 'original_technician', 'qc_rejected_by'
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
                # An existing customer was found, use it
                data['customer'] = customer.id
            else:
                # No existing customer found, create a new one
                customer_serializer = CustomerSerializer(data=customer_data)
                customer_serializer.is_valid(raise_exception=True)
                customer = customer_serializer.save()
                data['customer'] = customer.id
                customer_created = True

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)
        
        response_data = serializer.data
        response_data['customer_created'] = customer_created
        
        headers = self.get_success_headers(serializer.data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        task = self.get_object()
        user = request.user

        # Handle specific field updates with dedicated methods
        self._handle_customer_update(request.data.pop('customer', None), task)
        self._handle_debt_status(request.data, task, user)
        self._handle_payment_status_update(request.data, task, user)
        self._handle_workshop_logic(request.data, task, user)

        # Handle status transitions
        if 'status' in request.data:
            response = self._handle_status_update(request.data, task, user)
            if response:
                return response

        serializer = self.get_serializer(task, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)

    def _handle_customer_update(self, customer_data, task):
        if customer_data:
            customer_serializer = CustomerSerializer(task.customer, data=customer_data, partial=True)
            customer_serializer.is_valid(raise_exception=True)
            customer_serializer.save()

    def _handle_debt_status(self, data, task, user):
        if data.get('is_debt') is True:
            TaskActivity.objects.create(
                task=task, user=user, type=TaskActivity.ActivityType.STATUS_UPDATE, message="Task marked as debt."
            )

    def _handle_payment_status_update(self, data, task, user):
        if user.role == 'Accountant' and 'payment_status' in data:
            task.payment_status = data['payment_status']
            if data['payment_status'] == 'Fully Paid':
                task.paid_date = timezone.now().date()
            task.save()

    def _handle_workshop_logic(self, data, task, user):
        if 'workshop_location' in data and 'workshop_technician' in data:
            task.original_location = task.current_location
            task.workshop_status = 'In Workshop'
            task.original_technician = user
            task.workshop_sent_at = timezone.now()
            workshop_technician = get_object_or_404(User, id=data.get('workshop_technician'))
            workshop_location = get_object_or_404(Location, id=data.get('workshop_location'))
            task.current_location = workshop_location.name

        if data.get('workshop_status') in ['Solved', 'Not Solved']:
            if task.original_location:
                task.current_location = task.original_location
                task.original_location = None
            task.assigned_to = task.original_technician
            task.workshop_location = None
            task.workshop_technician = None
            task.original_technician = None
            task.workshop_returned_at = timezone.now()
            TaskActivity.objects.create(
                task=task, user=user, type=TaskActivity.ActivityType.WORKSHOP,
                message=f"Task returned from workshop with status: {data['workshop_status']}."
            )

    def _handle_status_update(self, data, task, user):
        new_status = data['status']
        if not can_transition(user, task, new_status):
            return Response(
                {"error": f"As a {user.role}, you cannot change status from '{task.status}' to '{new_status}'."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Create activity logs for specific transitions
        activity_messages = {
            'Picked Up': "Task has been picked up by the customer.",
            'Completed': "Task marked as Completed.",
            'Ready for Pickup': "Task has been approved and is ready for pickup."
        }
        if new_status in activity_messages:
            TaskActivity.objects.create(task=task, user=user, type=TaskActivity.ActivityType.STATUS_UPDATE, message=activity_messages[new_status])
            if new_status == 'Picked Up':
                data['sent_out_by'] = user.id
                data['date_out'] = timezone.now()

        if new_status == 'In Progress' and user.role == 'Front Desk':
            technician_id = data.get('assigned_to')
            if technician_id:
                technician = get_object_or_404(User, id=technician_id, role='Technician')
                task.assigned_to = technician
                TaskActivity.objects.create(
                    task=task, user=user, type=TaskActivity.ActivityType.STATUS_UPDATE,
                    message=f"Task assigned to {technician.get_full_name()}."
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
        Returns a list of tasks that are 'Picked Up' but not 'Fully Paid'.
        """
        tasks = self.get_queryset().filter(status='Picked Up').exclude(payment_status='Fully Paid')
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
            serializer.save(task=task, user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
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



