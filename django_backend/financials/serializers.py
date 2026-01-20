from rest_framework import serializers
from django.core.validators import MinValueValidator
from decimal import Decimal
from .models import (
    TransactionRequest,
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
