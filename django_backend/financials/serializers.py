from rest_framework import serializers
from django.core.validators import MinValueValidator
from decimal import Decimal
from .models import (
    ApprovalRequest,
    TransactionRequest,
    DebtRequest,
    ExpenditureRequest,  # Backwards compatibility alias
    Payment,
    PaymentCategory,
    PaymentMethod,
    Account,
    CostBreakdown,
)
from users.serializers import UserSerializer
from users.models import User


class CostBreakdownSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source="task.title", read_only=True)

    class Meta:
        model = CostBreakdown
        fields = [
            "id",
            "description",
            "amount",
            "cost_type",
            "category",
            "created_at",
            "reason",
            "payment_method",
            "task_title",
            "status",
        ]
        extra_kwargs = {"payment_method": {"write_only": True}}


class AccountSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Account
        fields = ["id", "name", "balance", "created_by", "created_at"]
        read_only_fields = ("id", "created_by", "created_at")


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = "__all__"


class PaymentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentCategory
        fields = "__all__"


class PaymentSerializer(serializers.ModelSerializer):
    method_name = serializers.SerializerMethodField()
    task_title = serializers.CharField(source="task.title", read_only=True)
    task_status = serializers.CharField(source="task.status", read_only=True)
    category_name = serializers.CharField(
        source="category.name", read_only=True, allow_null=True
    )

    def get_method_name(self, obj):
        """Return payment method name from snapshot if method is deleted, otherwise from FK"""
        if obj.method:
            return obj.method.name
        return obj.payment_method_name

    class Meta:
        model = Payment
        fields = (
            "id",
            "task",
            "task_title",
            "task_status",
            "amount",
            "date",
            "method",
            "method_name",
            "description",
            "category",
            "category_name",
        )
        read_only_fields = ["task"]
        extra_kwargs = {
            "amount": {"validators": [MinValueValidator(Decimal("0.00"))]},
        }


class TransactionRequestSerializer(serializers.ModelSerializer):
    """Serializer for unified Transaction Requests (Expenditure and Revenue)."""
    requester = UserSerializer(read_only=True)
    approver = UserSerializer(read_only=True)
    task_title = serializers.CharField(
        source="task.title", read_only=True, allow_null=True
    )
    category = PaymentCategorySerializer(read_only=True)
    payment_method = PaymentMethodSerializer(read_only=True)
    
    # Expose snapshot names
    requester_name = serializers.CharField(read_only=True)
    approver_name = serializers.CharField(read_only=True)
    payment_method_name = serializers.SerializerMethodField()

    # Write-only fields for creation
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=PaymentCategory.objects.all(), source="category", write_only=True
    )
    payment_method_id = serializers.PrimaryKeyRelatedField(
        queryset=PaymentMethod.objects.all(), source="payment_method", write_only=True, required=False, allow_null=True
    )
    # Approver selection for accountants (optional - if blank, broadcasts to all managers)
    approver_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='Manager', is_active=True), 
        source="approver", 
        write_only=True, 
        required=False, 
        allow_null=True
    )

    def get_payment_method_name(self, obj):
        """Return payment method name from snapshot if method is deleted, otherwise from FK"""
        if obj.payment_method:
            return obj.payment_method.name
        return obj.payment_method_name

    class Meta:
        model = TransactionRequest
        fields = (
            "id",
            "transaction_type",
            "description",
            "amount",
            "task",
            "task_title",
            "category",
            "payment_method",
            "payment_method_name",
            "status",
            "cost_type",
            "requester",
            "requester_name",
            "approver",
            "approver_name",
            "created_at",
            "updated_at",
            "category_id",
            "payment_method_id",
            "approver_id",
        )
        read_only_fields = (
            "status",
            "requester",
            "requester_name",
            "approver_name",
            "created_at",
            "updated_at",
        )


class DebtRequestSerializer(serializers.ModelSerializer):
    """Serializer for debt requests."""
    requester = UserSerializer(read_only=True)
    approver = UserSerializer(read_only=True)
    task_details = serializers.SerializerMethodField()
    
    # Expose snapshot names
    requester_name = serializers.CharField(read_only=True)
    approver_name = serializers.CharField(read_only=True)
    task_title = serializers.CharField(read_only=True)
    
    def get_task_details(self, obj):
        """Return task details including outstanding balance."""
        if obj.task:
            task = obj.task
            
            # Compute outstanding_balance using the same logic as TaskViewSet annotation:
            # calculated_total_cost = estimated_cost + additive_breakdowns - subtractive_breakdowns
            # calculated_paid_amount = sum of payments
            # outstanding_balance = calculated_total_cost - calculated_paid_amount
            
            from decimal import Decimal
            from django.db.models import Sum
            
            estimated_cost = task.estimated_cost or Decimal('0')
            
            # Get additive and subtractive cost breakdowns
            additive_breakdowns = task.cost_breakdowns.filter(
                cost_type='Additive'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            subtractive_breakdowns = task.cost_breakdowns.filter(
                cost_type='Subtractive'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            # Get total payments
            paid_amount = task.payments.aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            # Calculate outstanding balance
            total_cost = estimated_cost + additive_breakdowns - subtractive_breakdowns
            outstanding_balance = total_cost - paid_amount
            
            return {
                'id': task.id,
                'title': task.title,
                'customer_name': task.customer.name if task.customer else None,
                'outstanding_balance': str(outstanding_balance)
            }
        return None
    
    class Meta:
        model = DebtRequest
        fields = (
            'id',
            'task',
            'task_title',
            'task_details',
            'status',
            'requester',
            'requester_name',
            'approver',
            'approver_name',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'status',
            'requester',
            'requester_name',
            'approver',
            'approver_name',
            'task_title',
            'created_at',
            'updated_at',
        )


class ApprovalRequestSerializer(serializers.ModelSerializer):
    """Base serializer for all approval requests (polymorphic)."""
    request_type = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()
    
    class Meta:
        model = ApprovalRequest
        fields = [
            'id', 'request_type', 'status', 'description', 'amount',
            'requester_name', 'approver_name',
            'created_at', 'updated_at'
        ]
    
    def get_request_type(self, obj):
        """Return the display type of the request."""
        return obj.get_type_display()
    
    def get_description(self, obj):
        """Return the description from the concrete model."""
        return obj.get_description()
    
    def get_amount(self, obj):
        """Return the amount from the concrete model."""
        amount = obj.get_amount()
        return str(amount) if amount is not None else None


class UnifiedApprovalRequestSerializer(serializers.Serializer):
    """
    Polymorphic serializer that returns appropriate serializer based on instance type.
    Used for unified list views that show both TransactionRequest and DebtRequest.
    """
    def to_representation(self, instance):
        """Return the appropriate serializer representation based on instance type."""
        if isinstance(instance, DebtRequest):
            serializer = DebtRequestSerializer(instance, context=self.context)
            data = serializer.data
            data['request_type'] = 'debt'
            return data
        elif isinstance(instance, TransactionRequest):
            serializer = TransactionRequestSerializer(instance, context=self.context)
            data = serializer.data
            data['request_type'] = 'transaction'
            return data
        else:
            # Fallback to base serializer
            return ApprovalRequestSerializer(instance, context=self.context).data


# Backwards compatibility alias
ExpenditureRequestSerializer = TransactionRequestSerializer


class FinancialSummarySerializer(serializers.Serializer):
    revenue = PaymentSerializer(many=True, read_only=True)
    expenditures = PaymentSerializer(many=True, read_only=True)  # Now uses Payment records
    total_revenue = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_expenditures = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    net_balance = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    date_range = serializers.CharField(read_only=True)
    period_start = serializers.DateField(read_only=True)
    period_end = serializers.DateField(read_only=True)
