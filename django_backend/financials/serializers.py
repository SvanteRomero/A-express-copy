from rest_framework import serializers
from django.core.validators import MinValueValidator
from decimal import Decimal
from .models import ExpenditureRequest, Payment, PaymentCategory, PaymentMethod, Account, CostBreakdown
from users.serializers import UserSerializer

class CostBreakdownSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True)

    class Meta:
        model = CostBreakdown
        fields = ['id', 'description', 'amount', 'cost_type', 'category', 'created_at', 'reason', 'payment_method', 'task_title', 'status']
        extra_kwargs = {
            'payment_method': {'write_only': True}
        }

class AccountSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Account
        fields = ['id', 'name', 'balance', 'created_by', 'created_at']
        read_only_fields = ('id', 'created_by', 'created_at')

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = '__all__'


class PaymentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentCategory
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    method_name = serializers.CharField(source='method.name', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_status = serializers.CharField(source='task.status', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)

    class Meta:
        model = Payment
        fields = ('id', 'task', 'task_title', 'task_status', 'amount', 'date', 'method', 'method_name', 'description', 'category', 'category_name')
        read_only_fields = ['task']
        extra_kwargs = {
            'amount': {'validators': [MinValueValidator(Decimal('0.00'))]},
        }

class ExpenditureRequestSerializer(serializers.ModelSerializer):
    requester = UserSerializer(read_only=True)
    approver = UserSerializer(read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True, allow_null=True)
    category = PaymentCategorySerializer(read_only=True)
    payment_method = PaymentMethodSerializer(read_only=True)

    category_id = serializers.PrimaryKeyRelatedField(
        queryset=PaymentCategory.objects.all(), source='category', write_only=True
    )
    payment_method_id = serializers.PrimaryKeyRelatedField(
        queryset=PaymentMethod.objects.all(), source='payment_method', write_only=True
    )

    class Meta:
        model = ExpenditureRequest
        fields = (
            'id', 'description', 'amount', 'task', 'task_title', 'category', 'payment_method', 
            'status', 'cost_type', 'requester', 'approver', 'created_at', 'updated_at',
            'category_id', 'payment_method_id'
        )
        read_only_fields = ('status', 'requester', 'approver', 'created_at', 'updated_at')
