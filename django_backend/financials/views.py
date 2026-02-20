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
    ApprovalRequest,
    TransactionRequest,
    DebtRequest,
    ExpenditureRequest,  # Backwards compatibility alias
)
from .serializers import (
    PaymentSerializer,
    PaymentCategorySerializer,
    PaymentMethodSerializer,
    AccountSerializer,
    CostBreakdownSerializer,
    ApprovalRequestSerializer,
    TransactionRequestSerializer,
    DebtRequestSerializer,
    UnifiedApprovalRequestSerializer,
    ExpenditureRequestSerializer,  # Backwards compatibility alias
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

    def perform_create(self, serializer):
        instance = serializer.save()
        from .broadcasts import broadcast_payment_method_toast, broadcast_payment_method_update
        user_name = self.request.user.get_full_name() or self.request.user.username
        broadcast_payment_method_toast('created', instance.name, user_name)
        broadcast_payment_method_update()

    def perform_update(self, serializer):
        instance = serializer.save()
        from .broadcasts import broadcast_payment_method_toast, broadcast_payment_method_update
        user_name = self.request.user.get_full_name() or self.request.user.username
        broadcast_payment_method_toast('updated', instance.name, user_name)
        broadcast_payment_method_update()

    def perform_destroy(self, instance):
        payment_method_name = instance.name
        super().perform_destroy(instance)
        from .broadcasts import broadcast_payment_method_toast, broadcast_payment_method_update
        user_name = self.request.user.get_full_name() or self.request.user.username
        broadcast_payment_method_toast('deleted', payment_method_name, user_name)
        broadcast_payment_method_update()


class PaymentCategoryViewSet(viewsets.ModelViewSet):
    queryset = PaymentCategory.objects.all()
    serializer_class = PaymentCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrManagerOrAccountant]


from .pagination import CustomPagination


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows payments to be viewed.
    Supports filters: search, method, category, is_refunded (expenditures), amount_type
    """

    serializer_class = PaymentSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsAdminOrManagerOrFrontDeskOrAccountant,
    ]
    pagination_class = CustomPagination

    def get_queryset(self):
        queryset = Payment.objects.select_related("task", "method", "category").all()
        
        # Filter by task_payments (only payments linked to tasks)
        task_payments = self.request.query_params.get("task_payments")
        if task_payments:
            queryset = queryset.filter(task__isnull=False)

        # Filter by is_refunded (expenditures - negative amounts)
        is_refunded = self.request.query_params.get("is_refunded")
        if is_refunded and is_refunded.lower() == 'true':
            queryset = queryset.filter(amount__lt=0)
        elif is_refunded and is_refunded.lower() == 'false':
            queryset = queryset.filter(amount__gt=0)
        
        # Search by description
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(description__icontains=search)
        
        # Filter by payment method name
        method = self.request.query_params.get("method")
        if method and method != "all":
            queryset = queryset.filter(method__name__iexact=method)
        
        # Filter by category name
        category = self.request.query_params.get("category")
        if category and category != "all":
            queryset = queryset.filter(category__name__iexact=category)

        return queryset.order_by("-date")


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
        from Eapp.services import ActivityLogger
        task_id = self.kwargs.get("task_id")
        task = get_object_or_404(Task, title=task_id)
        instance = serializer.save(task=task)
        
        # Log the activity
        ActivityLogger.log_cost_breakdown_add(
            task=task,
            user=self.request.user,
            description=instance.description,
            amount=instance.amount,
            cost_type=instance.cost_type
        )

    def perform_destroy(self, instance):
        from Eapp.services import ActivityLogger
        task = instance.task
        description = instance.description
        amount = instance.amount
        
        super().perform_destroy(instance)
        
        # Log the activity
        ActivityLogger.log_cost_breakdown_delete(
            task=task,
            user=self.request.user,
            description=description,
            amount=amount
        )


class TransactionRequestViewSet(viewsets.ModelViewSet):
    """
    Unified ViewSet for Transaction Requests (both Expenditure and Revenue).
    
    Approval Logic:
    - Manager creates → auto-approved (approver = self)
    - Accountant selects specific manager → auto-approved (approver = selected manager)
    - Accountant leaves approver blank → pending, broadcast to all managers
    """
    serializer_class = TransactionRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrManagerOrAccountant]
    pagination_class = CustomPagination

    def get_queryset(self):
        user = self.request.user
        queryset = TransactionRequest.objects.select_related(
            "task", "category", "payment_method", "requester", "approver"
        )

        if not user.is_staff and not user.role in ["Manager", "Admin"]:
            queryset = queryset.filter(requester=user)

        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by transaction type
        transaction_type = self.request.query_params.get("transaction_type")
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        
        # Search by description
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(description__icontains=search)

        return queryset.order_by("-created_at")

    def get_permissions(self):
        if self.action in ["approve", "reject"]:
            self.permission_classes = [IsManager]
        else:
            self.permission_classes = [IsAdminOrManagerOrAccountant]
        return super().get_permissions()

    def perform_create(self, serializer):
        user = self.request.user
        is_manager = user.role == 'Manager'
        
        # Get the approver from serializer validated data (if provided)
        approver = serializer.validated_data.get('approver')
        
        if is_manager:
            # Manager creates → auto-approved with self as approver
            instance = serializer.save(
                requester=user,
                approver=user,
                status=TransactionRequest.Status.APPROVED
            )
            self._create_payment(instance)
            # Delete auto-approved request - no longer needed
            instance.delete()
        elif approver:
            # Accountant selected specific manager → auto-approved with that manager
            instance = serializer.save(
                requester=user,
                status=TransactionRequest.Status.APPROVED
            )
            self._create_payment(instance)
            # Delete auto-approved request - no longer needed
            instance.delete()
        else:
            # Accountant left blank → pending, broadcast to all managers
            instance = serializer.save(
                requester=user,
                status=TransactionRequest.Status.PENDING
            )
            # Broadcast to managers for approval
            from .broadcasts import broadcast_transaction_request
            broadcast_transaction_request(
                request_id=instance.id,
                transaction_type=instance.transaction_type,
                description=instance.description,
                amount=str(instance.amount),
                requester_name=user.get_full_name() or user.username,
                requester_id=user.id
            )
        
        from .broadcasts import broadcast_transaction_update
        broadcast_transaction_update()

    def _create_payment(self, instance):
        """Create Payment record based on transaction type."""
        # Determine amount sign based on transaction type
        if instance.transaction_type == TransactionRequest.TransactionType.REVENUE:
            amount = instance.amount  # Positive for revenue
        else:
            amount = -instance.amount  # Negative for expenditure

        Payment.objects.create(
            task=instance.task,
            amount=amount,
            method=instance.payment_method,
            description=instance.description,
            category=instance.category,
        )

        # Only create CostBreakdown for expenditures with tasks
        if instance.transaction_type == TransactionRequest.TransactionType.EXPENDITURE and instance.task:
            CostBreakdown.objects.create(
                task=instance.task,
                description=f"Expenditure: {instance.description}",
                amount=instance.amount,
                cost_type=instance.cost_type or CostBreakdown.CostType.INCLUSIVE,
                category=instance.category.name,
                payment_method=instance.payment_method,
                status=CostBreakdown.Status.APPROVED,
            )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        transaction = self.get_object()
        if transaction.status != "Pending":
            return Response(
                {"error": "This request has already been processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Store data before deletion
        requester_id = transaction.requester.id

        transaction.status = TransactionRequest.Status.APPROVED
        transaction.approver = request.user
        transaction.save()

        # Create payment and optionally cost breakdown
        self._create_payment(transaction)

        # Serialize before deletion for the response
        serializer = self.get_serializer(transaction)
        response_data = serializer.data

        # Delete the processed request - no longer needed
        transaction.delete()

        # Broadcast dismissal to all managers and notify requester
        from .broadcasts import broadcast_transaction_resolved, broadcast_transaction_update
        broadcast_transaction_resolved(
            request_id=pk,
            approved=True,
            approver=request.user,
            requester_id=requester_id
        )
        broadcast_transaction_update()

        return Response(response_data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        transaction = self.get_object()
        if transaction.status != "Pending":
            return Response(
                {"error": "This request has already been processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Store data before deletion
        requester_id = transaction.requester.id

        transaction.status = TransactionRequest.Status.REJECTED
        transaction.approver = request.user
        transaction.save()

        # Serialize before deletion for the response
        serializer = self.get_serializer(transaction)
        response_data = serializer.data

        # Delete rejected request immediately - serves no purpose
        transaction.delete()

        # Broadcast dismissal to all managers and notify requester
        from .broadcasts import broadcast_transaction_resolved, broadcast_transaction_update
        broadcast_transaction_resolved(
            request_id=pk,
            approved=False,
            approver=request.user,
            requester_id=requester_id
        )
        broadcast_transaction_update()

        return Response(response_data)

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        from .broadcasts import broadcast_transaction_update
        broadcast_transaction_update()


class DebtRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Debt Requests.
    Allows Front Desk/Accountant to request debt marking, and Managers to approve/reject.
    """
    queryset = DebtRequest.objects.select_related('task', 'requester', 'approver', 'task__customer')
    serializer_class = DebtRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomPagination
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Non-managers can only see their own requests
        if not user.is_staff and user.role not in ["Manager", "Admin"]:
            queryset = queryset.filter(requester=user)
        
        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by("-created_at")
    
    def get_permissions(self):
        if self.action in ["approve", "reject"]:
            self.permission_classes = [IsManager]
        elif self.action == "create":
            self.permission_classes = [IsAdminOrManagerOrFrontDeskOrAccountant]
        return super().get_permissions()
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a debt request and mark task as debt."""
        debt_request = self.get_object()
        
        if debt_request.status != DebtRequest.Status.PENDING:
            return Response(
                {"error": "This request has already been processed."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Store data before deletion
        requester_id = debt_request.requester.id if debt_request.requester else None
        requester_name = debt_request.requester_name
        task = debt_request.task
        debt_request_id = debt_request.id
        
        # Update request status
        debt_request.status = DebtRequest.Status.APPROVED
        debt_request.approver = request.user
        debt_request.save()
        
        # Mark task as debt
        task.is_debt = True
        task.save(update_fields=['is_debt'])
        
        # Log activity
        from Eapp.services import ActivityLogger
        ActivityLogger.log_debt_marking(
            task,
            request.user,
            f"Debt requested by {requester_name}, approved by {request.user.get_full_name() or request.user.username}"
        )
        
        # Serialize before deletion for the response
        serializer = self.get_serializer(debt_request)
        response_data = serializer.data
        
        # Delete the processed request - no longer needed
        debt_request.delete()
        
        # Broadcast resolution
        from Eapp.broadcasts import broadcast_debt_resolved
        broadcast_debt_resolved(
            task,
            approved=True,
            approver=request.user,
            requester_id=requester_id,
            request_id=debt_request_id
        )
        
        return Response(response_data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a debt request."""
        debt_request = self.get_object()
        
        if debt_request.status != DebtRequest.Status.PENDING:
            return Response(
                {"error": "This request has already been processed."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Store data before deletion
        requester_id = debt_request.requester.id if debt_request.requester else None
        task = debt_request.task
        debt_request_id = debt_request.id
        
        # Update request status
        debt_request.status = DebtRequest.Status.REJECTED
        debt_request.approver = request.user
        debt_request.save()
        
        # Serialize before deletion for the response
        serializer = self.get_serializer(debt_request)
        response_data = serializer.data
        
        # Delete rejected request - no longer needed
        debt_request.delete()
        
        # Broadcast resolution
        from Eapp.broadcasts import broadcast_debt_resolved
        broadcast_debt_resolved(
            task,
            approved=False,
            approver=request.user,
            requester_id=requester_id,
            request_id=debt_request_id
        )
        
        return Response(response_data)


class UnifiedApprovalRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Unified read-only view for all approval requests.
    Returns polymorphic list of TransactionRequest and DebtRequest.
    """
    serializer_class = UnifiedApprovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrManagerOrAccountant]
    pagination_class = CustomPagination
    
    def get_queryset(self):
        user = self.request.user
        
        # Get both types of requests
        transaction_qs = TransactionRequest.objects.select_related(
            'requester', 'approver', 'category', 'payment_method', 'task'
        )
        debt_qs = DebtRequest.objects.select_related(
            'requester', 'approver', 'task', 'task__customer'
        )
        
        # Apply user-based filtering
        if not user.is_staff and user.role not in ["Manager", "Admin"]:
            transaction_qs = transaction_qs.filter(requester=user)
            debt_qs = debt_qs.filter(requester=user)
        
        # Apply status filter
        status_filter = self.request.query_params.get("status")
        if status_filter:
            transaction_qs = transaction_qs.filter(status=status_filter)
            debt_qs = debt_qs.filter(status=status_filter)
        
        # Apply transaction_type filter (only affects TransactionRequests)
        transaction_type = self.request.query_params.get("transaction_type")
        if transaction_type:
            transaction_qs = transaction_qs.filter(transaction_type=transaction_type)
        
        # Apply request_type filter
        request_type = self.request.query_params.get("request_type")
        if request_type == "transaction":
            debt_qs = DebtRequest.objects.none()
        elif request_type == "debt":
            transaction_qs = TransactionRequest.objects.none()
        
        # Apply search filter
        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q
            # Search in transaction requests (description, requester name, category name)
            transaction_qs = transaction_qs.filter(
                Q(description__icontains=search) |
                Q(requester_name__icontains=search) |
                Q(category__name__icontains=search) |
                Q(task__title__icontains=search)
            )
            # Search in debt requests (task title, customer name, requester name)
            debt_qs = debt_qs.filter(
                Q(task_title__icontains=search) |
                Q(requester_name__icontains=search) |
                Q(task__customer__name__icontains=search)
            )
        
        # Combine and sort by created_at
        # Note: This returns a list, not a QuerySet
        combined = list(transaction_qs) + list(debt_qs)
        combined.sort(key=lambda x: x.created_at, reverse=True)
        
        return combined


# Backwards compatibility alias
ExpenditureRequestViewSet = TransactionRequestViewSet


class FinancialSummaryView(APIView):
    """
    API endpoint that returns comprehensive financial summary for a specific date.
    Uses actual Payment records for both revenue and expenditures.
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

        # Build date filter for the specific date
        date_filter = Q(date=selected_date)

        # Get revenue data (positive payments) for the specific date
        revenue_payments = (
            Payment.objects.filter(date_filter, amount__gt=0)
            .select_related("task", "method", "category")
            .order_by("-date")
        )

        # Get expenditure data (negative payments) for the specific date
        # These are actual confirmed expenditures, not just requests
        expenditure_payments = (
            Payment.objects.filter(date_filter, amount__lt=0)
            .select_related("task", "method", "category")
            .order_by("-date")
        )

        # Calculate totals
        total_revenue = revenue_payments.aggregate(total=Sum("amount"))["total"] or 0
        
        # Expenditures are stored as negative, so we use abs() for display
        total_expenditures_raw = expenditure_payments.aggregate(total=Sum("amount"))["total"] or 0
        total_expenditures = abs(total_expenditures_raw)

        net_balance = total_revenue - total_expenditures

        # Prepare response data - using unified Payment serializer format
        financial_data = {
            "revenue": revenue_payments,
            "expenditures": expenditure_payments,
            "total_revenue": total_revenue,
            "total_expenditures": total_expenditures,
            "net_balance": net_balance,
            "date": selected_date.isoformat(),
            "period_start": selected_date.isoformat(),
            "period_end": selected_date.isoformat(),
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

