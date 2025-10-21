from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import (
    Payment, PaymentCategory, PaymentMethod, Account, CostBreakdown, ExpenditureRequest
)
from .serializers import (
    PaymentSerializer, 
    PaymentCategorySerializer, 
    PaymentMethodSerializer, 
    AccountSerializer, 
    CostBreakdownSerializer,
    ExpenditureRequestSerializer
)
from Eapp.models import Task
from users.permissions import IsManager, IsAdminOrManagerOrFrontDeskOrAccountant, IsAdminOrManagerOrAccountant


class AccountViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows accounts to be viewed or edited by managers.
    """
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [IsManager]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class PaymentMethodViewSet(viewsets.ModelViewSet):
    queryset = PaymentMethod.objects.filter(is_user_selectable=True)
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

class PaymentCategoryViewSet(viewsets.ModelViewSet):
    queryset = PaymentCategory.objects.all()
    serializer_class = PaymentCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrManagerOrAccountant]


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows payments to be viewed.
    """
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrManagerOrFrontDeskOrAccountant]

    def get_queryset(self):
        queryset = Payment.objects.all()
        task_payments = self.request.query_params.get('task_payments')
        is_refunded = self.request.query_params.get('is_refunded')

        if task_payments:
            queryset = queryset.filter(task__isnull=False)
        
        if is_refunded:
            queryset = queryset.filter(amount__lt=0)

        return queryset


class CostBreakdownViewSet(viewsets.ModelViewSet):
    queryset = CostBreakdown.objects.all()
    serializer_class = CostBreakdownSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrManagerOrAccountant]

    def get_queryset(self):
        queryset = CostBreakdown.objects.all()
        task_id = self.kwargs.get('task_id')
        if task_id:
            queryset = queryset.filter(task__title=task_id)
        return queryset

    def perform_create(self, serializer):
        task_id = self.kwargs.get('task_id')
        task = get_object_or_404(Task, title=task_id)
        serializer.save(task=task)

class ExpenditureRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenditureRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrManagerOrAccountant]

    def get_queryset(self):
        user = self.request.user
        queryset = ExpenditureRequest.objects.select_related(
            'task', 'category', 'payment_method', 'requester', 'approver'
        )

        if not user.is_staff and not user.role in ['Manager', 'Admin']:
            queryset = queryset.filter(requester=user)
            
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset

    def get_permissions(self):
        if self.action in ['approve', 'reject']:
            self.permission_classes = [IsManager]
        else:
            self.permission_classes = [IsAdminOrManagerOrAccountant]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        expenditure = self.get_object()
        if expenditure.status != 'Pending':
            return Response({'error': 'This request has already been processed.'}, status=status.HTTP_400_BAD_REQUEST)

        expenditure.status = ExpenditureRequest.Status.APPROVED
        expenditure.approver = request.user
        expenditure.save()

        # Create a corresponding payment record
        Payment.objects.create(
            task=expenditure.task,
            amount=-expenditure.amount,  # Expenditures are negative amounts
            method=expenditure.payment_method,
            description=f"{expenditure.description}",
            category=expenditure.category
        )

        # If linked to a task, create a cost breakdown item
        if expenditure.task:
            CostBreakdown.objects.create(
                task=expenditure.task,
                description=f"Expenditure: {expenditure.description}",
                amount=expenditure.amount,
                cost_type=expenditure.cost_type,
                category=expenditure.category.name,
                payment_method=expenditure.payment_method,
                status=CostBreakdown.Status.APPROVED
            )

        serializer = self.get_serializer(expenditure)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        expenditure = self.get_object()
        if expenditure.status != 'Pending':
            return Response({'error': 'This request has already been processed.'}, status=status.HTTP_400_BAD_REQUEST)

        expenditure.status = ExpenditureRequest.Status.REJECTED
        expenditure.approver = request.user
        expenditure.save()

        serializer = self.get_serializer(expenditure)
        return Response(serializer.data)