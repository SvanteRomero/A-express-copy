from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User
from .models import Session, AuditLog


def _get_os_name(ua: str) -> str:
    if 'Windows' in ua:
        return 'Windows'
    if 'Mac OS' in ua or 'Macintosh' in ua:
        return 'macOS'
    if 'Linux' in ua:
        return 'Linux'
    if 'Android' in ua:
        return 'Android'
    if 'iPhone' in ua or 'iPad' in ua:
        return 'iOS'
    return 'Unknown OS'


def _get_browser(ua: str) -> str:
    if 'Chrome' in ua and 'Edg' not in ua:
        return 'Chrome'
    if 'Firefox' in ua:
        return 'Firefox'
    if 'Safari' in ua and 'Chrome' not in ua:
        return 'Safari'
    if 'Edg' in ua:
        return 'Edge'
    return 'Browser'


class SessionSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()
    device_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Session
        fields = ('id', 'device_name', 'device_info', 'user_agent', 'ip_address', 
                  'created_at', 'last_activity', 'expires_at', 'is_revoked', 'is_current')
    
    def get_is_current(self, obj):
        """Check if this session matches the current request's JWT."""
        request = self.context.get('request')
        if not request:
            return False
        
        # Try to get JTI from the current request's access token
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from django.conf import settings
            
            # Get token from cookie or header
            token = request.COOKIES.get(settings.JWT_AUTH_COOKIE)
            if not token:
                auth_header = request.META.get('HTTP_AUTHORIZATION', '')
                if auth_header.startswith('Bearer '):
                    token = auth_header[7:]
            
            if token:
                access_token = AccessToken(token)
                current_jti = str(access_token.get('jti', ''))
                # Compare with session's JTI
                return obj.jti == current_jti
        except Exception:
            pass
        
        return False
    
    def get_device_info(self, obj):
        """Parse user agent to get friendly device name."""
        ua = obj.user_agent or ''
        return f"{_get_browser(ua)} on {_get_os_name(ua)}"


class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = ('id', 'created_at', 'user', 'action', 'resource_type', 'resource_id', 'severity', 'metadata')

class UserSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    active_task_count = serializers.IntegerField(required=False, read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'full_name',
                    'phone', 'role', 'is_workshop', 'profile_picture', 'profile_picture_url', 'is_active', 'created_at', 'last_login', 'active_task_count') 
        read_only_fields = ('id', 'created_at', 'last_login', 'full_name', 'active_task_count') 
        
    def get_profile_picture_url(self, obj):
        """Return absolute URL for profile picture that works in all environments."""
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            url = obj.profile_picture.url
            # S3 URLs are already absolute, return as-is
            if url.startswith('http'):
                return url
            # For local development, build absolute URI with domain
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(url)
            return url
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
            # Get request from context (required for django-axes)
            request = self.context.get('request')
            user = authenticate(request=request, username=username, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError('User account is disabled.')
                data['user'] = user
                return data
            raise serializers.ValidationError('Unable to log in with provided credentials.')
        raise serializers.ValidationError('Must include "username" and "password".')

