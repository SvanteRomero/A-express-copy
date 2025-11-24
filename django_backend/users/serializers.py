from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User
from .models import Session, AuditLog


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ('id', 'device_name', 'user_agent', 'ip_address', 'created_at', 'last_activity', 'expires_at', 'is_revoked')


class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = ('id', 'created_at', 'user', 'action', 'resource_type', 'resource_id', 'severity', 'metadata')

class UserSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'full_name',
                    'phone', 'role', 'is_workshop', 'profile_picture', 'profile_picture_url', 'is_active', 'created_at', 'last_login') 
        read_only_fields = ('id', 'created_at', 'last_login', 'full_name') 
        
    def get_profile_picture_url(self, obj):
        request = self.context.get('request')
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            return obj.profile_picture.url
        return None

class UserListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ['full_name']

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
        # Handle partial updates, especially for the profile picture
        for attr, value in validated_data.items():
            if attr == 'profile_picture':
                instance.profile_picture = value
            else:
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
                    'last_name', 'phone', 'role', 'is_workshop')
    
    def validate_role(self, value):
        if value not in dict(User.Role.choices):
            raise serializers.ValidationError("Invalid role.")
        return value

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
