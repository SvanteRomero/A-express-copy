from rest_framework import serializers
from django.core.validators import MinValueValidator
from decimal import Decimal
from common.serializers import BrandSerializer, LocationSerializer
from customers.serializers import CustomerSerializer, ReferrerSerializer, CustomerListSerializer
from .models import Task, TaskActivity
from users.serializers import UserSerializer, UserListSerializer
from users.models import User
from financials.serializers import CostBreakdownSerializer, PaymentSerializer

class TaskActivitySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TaskActivity
        fields = ("id", "user", "timestamp", "type", "message", "details")

class TaskListSerializer(serializers.ModelSerializer):
    customer_details = CustomerListSerializer(source='customer', read_only=True)
    assigned_to_details = UserListSerializer(source='assigned_to', read_only=True)
    outstanding_balance = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            'id',
            'title',
            'status',
            'urgency',
            'payment_status',
            'workshop_status',
            'current_location',
            'laptop_model',
            'description',
            'updated_at',
            'customer_details',
            'assigned_to_details',
            'outstanding_balance',
        )

    def get_outstanding_balance(self, obj):
        return obj.total_cost - obj.paid_amount

class TaskDetailSerializer(serializers.ModelSerializer):
    assigned_to_details = UserSerializer(source="assigned_to", read_only=True)
    created_by_details = UserSerializer(source="created_by", read_only=True)
    approved_by_details = UserSerializer(source="approved_by", read_only=True)
    sent_out_by_details = UserSerializer(source="sent_out_by", read_only=True)
    brand_details = BrandSerializer(source="brand", read_only=True)
    referred_by = serializers.CharField(
        source="referred_by.name", allow_blank=True, allow_null=True, required=False
    )
    referred_by_details = ReferrerSerializer(source="referred_by", read_only=True)
    customer_details = CustomerSerializer(source="customer", read_only=True)
    activities = TaskActivitySerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    outstanding_balance = serializers.SerializerMethodField()
    workshop_location_details = LocationSerializer(
        source="workshop_location", read_only=True
    )
    workshop_technician_details = UserSerializer(
        source="workshop_technician", read_only=True
    )
    original_technician_snapshot_details = UserSerializer(
        source="original_technician_snapshot", read_only=True
    )
    original_technician = serializers.PrimaryKeyRelatedField(read_only=True)
    original_technician_details = UserSerializer(source='original_technician', read_only=True)
    original_location_snapshot = serializers.CharField(read_only=True)
    latest_pickup_at = serializers.DateTimeField(read_only=True)
    latest_pickup_by_details = UserSerializer(source='latest_pickup_by', read_only=True)
    cost_breakdowns = CostBreakdownSerializer(many=True, read_only=True)
    negotiated_by = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True), allow_null=True, required=False
    )
    negotiated_by_details = UserSerializer(source="negotiated_by", read_only=True)

    class Meta:
        model = Task
        fields = (
            'id', 'title', 'description', 'status', 'urgency',
            'assigned_to', 'assigned_to_details', 'created_by_details',
            'created_at', 'updated_at', 'due_date',
            'customer', 'customer_details',
            'brand', 'brand_details', 'laptop_model',
            'device_type', 'device_notes',
            'estimated_cost', 'total_cost', 'paid_amount', 'payment_status',
            'current_location', 'date_in', 'approved_at', 'approved_by',
            'paid_date', 'next_payment_date', 'date_out', 'negotiated_by', 'negotiated_by_details',
            'activities', 'payments', 'outstanding_balance', 'is_referred', 'is_debt', 'referred_by', 'referred_by_details',
            'workshop_status', 'workshop_location', 'workshop_technician', 'original_technician_snapshot', 'original_location_snapshot', 'original_technician', 'original_technician_details',
            'workshop_location_details', 'workshop_technician_details', 'original_technician_snapshot_details', 'approved_by_details',
            'latest_pickup_at', 'latest_pickup_by', 'latest_pickup_by_details',
            'sent_out_by', 'sent_out_by_details',
            'qc_notes', 'qc_rejected_at', 'qc_rejected_by',
            'cost_breakdowns'
        )
        read_only_fields = ('created_at', 'updated_at', 'assigned_to_details', 'created_by_details', 'activities', 'payments',
                    'workshop_location_details', 'workshop_technician_details', 'original_technician_snapshot_details', 'approved_by_details', 'sent_out_by_details',
                            'total_cost', 'paid_amount')
        extra_kwargs = {
            "estimated_cost": {"validators": [MinValueValidator(Decimal("0.00"))]},
        }

    def get_total_cost(self, obj):
        estimated_cost = obj.estimated_cost or Decimal("0.00")
        additive_costs = sum(
            item.amount for item in obj.cost_breakdowns.filter(cost_type="Additive")
        )
        subtractive_costs = sum(
            item.amount for item in obj.cost_breakdowns.filter(cost_type="Subtractive")
        )
        return estimated_cost + additive_costs - subtractive_costs

    def get_outstanding_balance(self, obj):
        total_cost = self.get_total_cost(obj)
        paid_sum = sum(p.amount for p in obj.payments.all()) or Decimal("0.00")
        return total_cost - paid_sum

    def validate(self, data):
        device_type = data.get("device_type")
        device_notes = data.get("device_notes")

        if device_type in ["Not Full", "Motherboard Only"] and not device_notes:
            raise serializers.ValidationError(
                {
                    "device_notes": "Device notes are required for 'Not Full' or 'Motherboard Only' device types."
                }
            )

        return data

    def create(self, validated_data):
        # Business logic moved to TaskViewSet.create
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Business logic moved to TaskViewSet.update
        return super().update(instance, validated_data)


# class SavedReportSerializer(serializers.ModelSerializer):
#     created_by_details = UserSerializer(source="created_by", read_only=True)

#     class Meta:
#         model = SavedReport
#         fields = [
#             "id",
#             "name",
#             "description",
#             "config",
#             "created_by",
#             "created_by_details",
#             "created_at",
#             "is_public",
#         ]
#         read_only_fields = ["created_by", "created_at"]


class ReportConfigSerializer(serializers.Serializer):
    reportName = serializers.CharField(max_length=255)
    selectedType = serializers.CharField()
    selectedFields = serializers.ListField(child=serializers.CharField())
    dateRange = serializers.CharField()
    customStartDate = serializers.DateField(required=False, allow_null=True)
    customEndDate = serializers.DateField(required=False, allow_null=True)

    def validate(self, data):
        # Validate custom date range
        if data.get("dateRange") == "custom":
            if not data.get("customStartDate") or not data.get("customEndDate"):
                raise serializers.ValidationError(
                    "Custom start date and end date are required for custom date range"
                )
            if data["customStartDate"] > data["customEndDate"]:
                raise serializers.ValidationError("Start date cannot be after end date")
        return data
