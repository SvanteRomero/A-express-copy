from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import (
    Payment,
    PaymentCategory,
    PaymentMethod,
    Account,
    CostBreakdown,
    ExpenditureRequest,
)
from .serializers import (
    PaymentSerializer,
    PaymentCategorySerializer,
    PaymentMethodSerializer,
    AccountSerializer,
    CostBreakdownSerializer,
    ExpenditureRequestSerializer,
    FinancialSummarySerializer,
)
from Eapp.models import Task
from users.permissions import (
    IsManager,
    IsAdminOrManagerOrFrontDeskOrAccountant,
    IsAdminOrManagerOrAccountant,
)

from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Sum, Q


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
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()


class PaymentCategoryViewSet(viewsets.ModelViewSet):
    queryset = PaymentCategory.objects.all()
    serializer_class = PaymentCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrManagerOrAccountant]


from .pagination import CustomPagination


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows payments to be viewed.
    """

    serializer_class = PaymentSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsAdminOrManagerOrFrontDeskOrAccountant,
    ]
    pagination_class = CustomPagination

    def get_queryset(self):
        queryset = Payment.objects.all()
        task_payments = self.request.query_params.get("task_payments")
        is_refunded = self.request.query_params.get("is_refunded")

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
        task_id = self.kwargs.get("task_id")
        if task_id:
            queryset = queryset.filter(task__title=task_id)
        return queryset

    def perform_create(self, serializer):
        task_id = self.kwargs.get("task_id")
        task = get_object_or_404(Task, title=task_id)
        serializer.save(task=task)


class ExpenditureRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenditureRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrManagerOrAccountant]
    pagination_class = CustomPagination

    def get_queryset(self):
        user = self.request.user
        queryset = ExpenditureRequest.objects.select_related(
            "task", "category", "payment_method", "requester", "approver"
        )

        if not user.is_staff and not user.role in ["Manager", "Admin"]:
            queryset = queryset.filter(requester=user)

        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)

        return queryset

    def get_permissions(self):
        if self.action in ["approve", "reject", "create_and_approve"]:
            self.permission_classes = [IsManager]
        else:
            self.permission_classes = [IsAdminOrManagerOrAccountant]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    @action(detail=False, methods=["post"])
    def create_and_approve(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Manually create the expenditure to set all required fields
        expenditure = serializer.save(
            requester=request.user,
            approver=request.user,
            status=ExpenditureRequest.Status.APPROVED,
        )

        # Create a corresponding payment record
        Payment.objects.create(
            task=expenditure.task,
            amount=-expenditure.amount,  # Expenditures are negative amounts
            method=expenditure.payment_method,
            description=f"{expenditure.description}",
            category=expenditure.category,
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
                status=CostBreakdown.Status.APPROVED,
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        expenditure = self.get_object()
        if expenditure.status != "Pending":
            return Response(
                {"error": "This request has already been processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expenditure.status = ExpenditureRequest.Status.APPROVED
        expenditure.approver = request.user
        expenditure.save()

        # Create a corresponding payment record
        Payment.objects.create(
            task=expenditure.task,
            amount=-expenditure.amount,  # Expenditures are negative amounts
            method=expenditure.payment_method,
            description=f"{expenditure.description}",
            category=expenditure.category,
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
                status=CostBreakdown.Status.APPROVED,
            )

        serializer = self.get_serializer(expenditure)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        expenditure = self.get_object()
        if expenditure.status != "Pending":
            return Response(
                {"error": "This request has already been processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expenditure.status = ExpenditureRequest.Status.REJECTED
        expenditure.approver = request.user
        expenditure.save()

        serializer = self.get_serializer(expenditure)
        return Response(serializer.data)


class FinancialSummaryView(APIView):
    """
    API endpoint that returns comprehensive financial summary for a specific date
    """

    permission_classes = [permissions.IsAuthenticated, IsAdminOrManagerOrAccountant]

    def get(self, request):
        # Get specific date from query parameters
        date_str = request.query_params.get("date")

        if not date_str:
            return Response({"error": "Date parameter is required"}, status=400)

        try:
            # Parse the specific date
            selected_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."}, status=400
            )

        # Build date filters for the specific date only
        date_filter_payments = Q(date=selected_date)
        date_filter_expenditures = Q(created_at__date=selected_date)

        # Get revenue data (positive payments) for the specific date
        revenue_payments = (
            Payment.objects.filter(
                date_filter_payments, amount__gt=0  # Only positive amounts for revenue
            )
            .select_related("task", "method", "category")
            .order_by("-date")
        )

        # Get expenditure data (approved expenditure requests) for the specific date
        expenditures = (
            ExpenditureRequest.objects.filter(
                date_filter_expenditures, status="Approved"
            )
            .select_related(
                "task", "category", "payment_method", "requester", "approver"
            )
            .order_by("-created_at")
        )

        # Calculate totals
        total_revenue = revenue_payments.aggregate(total=Sum("amount"))["total"] or 0

        total_expenditures = expenditures.aggregate(total=Sum("amount"))["total"] or 0

        net_balance = total_revenue - total_expenditures

        # Prepare response data
        financial_data = {
            "revenue": revenue_payments,
            "expenditures": expenditures,
            "total_revenue": total_revenue,
            "total_expenditures": total_expenditures,
            "net_balance": net_balance,
            "date": selected_date.isoformat(),
            "period_start": selected_date.isoformat(),
            "period_end": selected_date.isoformat(),  # Keep for compatibility
        }

        serializer = FinancialSummarySerializer(financial_data)
        return Response(serializer.data)


# =============================================================================
# Accountant Dashboard Stats
# =============================================================================

from django.db.models import F


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

