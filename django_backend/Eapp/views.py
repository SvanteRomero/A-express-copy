from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone  # FIXED: Import from django.utils, not from time
from .models import User
from .serializers import ChangePasswordSerializer, UserProfileUpdateSerializer, UserSerializer, UserRegistrationSerializer, LoginSerializer
from django.shortcuts import get_object_or_404


class IsAdminOrManager(permissions.BasePermission):
    """
    Custom permission to only allow admins or managers to add users.
    """
    def has_permission(self, request, view):
        # Check if user is authenticated first
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Now check if user is superuser or manager
        return request.user.is_superuser or request.user.role == 'Manager'
    

@api_view(['POST'])
@permission_classes([IsAdminOrManager])
def register_user(request):
    # Add the request to the serializer context
    serializer = UserRegistrationSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_user(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        user.last_login = timezone.now()  # This will now work correctly
        user.save(update_fields=['last_login'])
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def get_user_profile(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAdminOrManager])
def list_users(request):
    users = User.objects.all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    
@api_view(['PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_profile(request):
    print("Update profile called with data:", request.data)
    user = request.user
    serializer = UserSerializer(user, data=request.data, partial=True)
    
  
    
    if serializer.is_valid():
        
        serializer.save()
        print("Serializer is valid. Data:", serializer.data)
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_profile_picture(request):
    user = request.user
    if 'profile_picture' not in request.FILES:
        return Response({"error": "No profile picture provided"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Use UserProfileUpdateSerializer for better handling
    serializer = UserProfileUpdateSerializer(user, data={'profile_picture': request.FILES['profile_picture']}, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        # Return full user data with UserSerializer
        user_serializer = UserSerializer(user, context={'request': request})
        return Response(user_serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAdminOrManager])
def get_user_detail(request, user_id):
    """
    Get details of a specific user
    """
    user = get_object_or_404(User, id=user_id)
    serializer = UserSerializer(user)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminOrManager])
def update_user(request, user_id):
    """
    Update a user's information (Manager/Admin only)
    """
    user = get_object_or_404(User, id=user_id)
    
    # Check if trying to update superuser (only other superusers can update superusers)
    if user.is_superuser and not request.user.is_superuser:
        return Response(
            {"error": "Only superusers can update other superusers."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = UserSerializer(user, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminOrManager])
def delete_user(request, user_id):
    """
    Delete a user (Manager/Admin only)
    """
    user = get_object_or_404(User, id=user_id)
    
    # Prevent self-deletion
    if user.id == request.user.id:
        return Response(
            {"error": "You cannot delete your own account."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Check if trying to delete superuser (only other superusers can delete superusers)
    if user.is_superuser and not request.user.is_superuser:
        return Response(
            {"error": "Only superusers can delete other superusers."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    user.delete()
    return Response(
        {"message": "User deleted successfully."},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([IsAdminOrManager])
def deactivate_user(request, user_id):
    """
    Deactivate a user account (Manager/Admin only)
    """
    user = get_object_or_404(User, id=user_id)
    
    # Prevent self-deactivation
    if user.id == request.user.id:
        return Response(
            {"error": "You cannot deactivate your own account."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    user.is_active = False
    user.save()
    
    return Response(
        {"message": "User deactivated successfully."},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([IsAdminOrManager])
def activate_user(request, user_id):
    """
    Activate a user account (Manager/Admin only)
    """
    user = get_object_or_404(User, id=user_id)
    user.is_active = True
    user.save()
    
    return Response(
        {"message": "User activated successfully."},
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@permission_classes([IsAdminOrManager])
def list_users_by_role(request, role):
    """
    List users filtered by role
    """
    # Validate role
    valid_roles = [choice[0] for choice in User.Role.choices]
    if role not in valid_roles:
        return Response(
            {"error": f"Invalid role. Valid roles are: {', '.join(valid_roles)}"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    users = User.objects.filter(role=role)
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """
    Change user password
    """
    user = request.user
    serializer = ChangePasswordSerializer(data=request.data)
    
    if serializer.is_valid():
        # Check old password
        if not user.check_password(serializer.validated_data['current_password']):
            return Response(
                {"error": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set new password
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response(
            {"message": "Password updated successfully."},
            status=status.HTTP_200_OK
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)