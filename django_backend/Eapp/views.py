from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from .models import User, Task, TaskActivity, Payment
from .serializers import (
    ChangePasswordSerializer, UserProfileUpdateSerializer, UserSerializer, 
    UserRegistrationSerializer, LoginSerializer, TaskSerializer,
    TaskActivitySerializer, PaymentSerializer
)
from django.shortcuts import get_object_or_404


class IsAdminOrManager(permissions.BasePermission):
    """
    Custom permission to only allow admins or managers to add users.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or request.user.role == 'Manager'

class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.role == 'Manager' or request.user.is_superuser)

class IsFrontDesk(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'Front Desk'

class IsTechnician(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'Technician'

@api_view(['POST'])
@permission_classes([IsAdminOrManager])
def register_user(request):
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
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
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
    user = request.user
    serializer = UserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_profile_picture(request):
    user = request.user
    if 'profile_picture' not in request.FILES:
        return Response({"error": "No profile picture provided"}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = UserProfileUpdateSerializer(user, data={'profile_picture': request.FILES['profile_picture']}, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        user_serializer = UserSerializer(user, context={'request': request})
        return Response(user_serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAdminOrManager])
def get_user_detail(request, user_id):
    user = get_object_or_404(User, id=user_id)
    serializer = UserSerializer(user)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminOrManager])
def update_user(request, user_id):
    user = get_object_or_404(User, id=user_id)
    
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
    user = get_object_or_404(User, id=user_id)
    
    if user.id == request.user.id:
        return Response(
            {"error": "You cannot delete your own account."},
            status=status.HTTP_403_FORBIDDEN
        )
    
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
    user = get_object_or_404(User, id=user_id)
    
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
    user = request.user
    serializer = ChangePasswordSerializer(data=request.data)
    
    if serializer.is_valid():
        if not user.check_password(serializer.validated_data['current_password']):
            return Response(
                {"error": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response(
            {"message": "Password updated successfully."},
            status=status.HTTP_200_OK
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def task_list_create(request):
    if request.method == 'GET':
        if request.user.role in ['Manager', 'Front Desk'] or request.user.is_superuser:
            tasks = Task.objects.all()
        else:
            tasks = Task.objects.filter(assigned_to=request.user)
        
        serializer = TaskSerializer(tasks, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        if not (request.user.role in ['Manager', 'Front Desk'] or request.user.is_superuser):
            return Response(
                {"error": "You do not have permission to create tasks."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = TaskSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def task_detail(request, task_id):
    task = get_object_or_404(Task, id=task_id)

    if request.method == 'GET':
        serializer = TaskSerializer(task, context={'request': request})
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        user = request.user
        role = user.role
        is_manager = role == 'Manager' or user.is_superuser
        is_front_desk = role == 'Front Desk'
        is_technician = role == 'Technician' and task.assigned_to == user

        if not (is_manager or is_front_desk or is_technician):
            return Response(
                {"error": "You do not have permission to update this task."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if is_technician:
            allowed_fields = {'status', 'description', 'assigned_to', 'current_location'}
            if any(field not in allowed_fields for field in request.data.keys()):
                return Response(
                    {"error": "Technicians can only update status, description, assigned_to, and current_location."},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif is_front_desk:
            allowed_fields = {
                'title', 'description', 'priority', 'assigned_to', 'due_date',
                'customer_name', 'customer_phone', 'customer_email',
                'laptop_make', 'laptop_model', 'serial_number',
                'estimated_cost', 'total_cost',
                'current_location', 'urgency', 'date_in', 'approved_date',
                'date_out', 'negotiated_by', 'status'  # Allow status for pickup, etc.
            }
            if any(field not in allowed_fields for field in request.data.keys()):
                return Response(
                    {"error": "Front Desk can only update customer and administrative details."},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = TaskSerializer(task, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        if not (request.user.role == 'Manager' or request.user.is_superuser):
            return Response(
                {"error": "You do not have permission to delete tasks."},
                status=status.HTTP_403_FORBIDDEN
            )
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def task_activities(request, task_id):
    task = get_object_or_404(Task, id=task_id)
    activities = task.activities.all()
    serializer = TaskActivitySerializer(activities, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_task_activity(request, task_id):
    task = get_object_or_404(Task, id=task_id)
    serializer = TaskActivitySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(task=task, user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def task_payments(request, task_id):
    task = get_object_or_404(Task, id=task_id)
    payments = task.payments.all()
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_task_payment(request, task_id):
    if not (request.user.role in ['Manager', 'Front Desk'] or request.user.is_superuser):
        return Response(
            {"error": "You do not have permission to add payments."},
            status=status.HTTP_403_FORBIDDEN
        )
    task = get_object_or_404(Task, id=task_id)
    serializer = PaymentSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(task=task)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)