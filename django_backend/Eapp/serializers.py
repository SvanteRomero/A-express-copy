from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Task, TaskActivity, Payment

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 
                 'phone', 'role','profile_picture', 'is_active', 'created_at', 'last_login')  
        read_only_fields = ('id', 'created_at', 'last_login')  
        
    def get_profile_picture_url(self, obj):
        request = self.context.get('request')
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            return request.build_absolute_uri(obj.profile_picture.url) if request else obj.profile_picture.url
        return None


        
class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'phone', 'profile_picture')
        extra_kwargs = {
            'email': {'required': False},
            'first_name': {'required': False},
            'last_name': {'required': False},
        }

    def update(self, instance, validated_data):
        # Handle partial updates
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance   
    
class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True, min_length=8)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("New passwords don't match.")
        return data

     
        
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 
                 'last_name', 'phone', 'role')
    
    def create(self, validated_data):
        # Check if the requesting user has permission to create users
        request = self.context.get('request')
        if request and not request.user.has_add_user_permission():
            raise serializers.ValidationError('You do not have permission to create users.')
        
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError('User account is disabled.')
                data['user'] = user
                return data
            raise serializers.ValidationError('Unable to log in with provided credentials.')
        raise serializers.ValidationError('Must include "username" and "password".')


class TaskActivitySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TaskActivity
        fields = ('id', 'user', 'timestamp', 'type', 'message')


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ('id', 'amount', 'date', 'method', 'reference')


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_details = UserSerializer(source='assigned_to', read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    negotiated_by_details = UserSerializer(source='negotiated_by', read_only=True)
    activities = TaskActivitySerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = (
            'id', 'title', 'description', 'status', 'priority', 
            'assigned_to', 'assigned_to_details', 'created_by', 'created_by_details',
            'created_at', 'updated_at', 'due_date',
            'customer_name', 'customer_phone', 'customer_email',
            'laptop_make', 'laptop_model', 'serial_number',
            'estimated_cost', 'total_cost', 'payment_status',
            'current_location', 'urgency', 'date_in', 'approved_date',
            'paid_date', 'date_out', 'negotiated_by', 'negotiated_by_details',
            'activities', 'payments'
        )
        read_only_fields = ('created_by', 'created_at', 'updated_at', 'assigned_to_details', 'created_by_details', 'negotiated_by_details', 'activities', 'payments')

    def create(self, validated_data):
        # Automatically set created_by to the current user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
    
