from rest_framework import status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from datetime import datetime
from .models import User
from .serializers import (
    UserSerializer, 
    UserRegistrationSerializer, 
    LoginSerializer, 
    ChangePasswordSerializer, 
    UserProfileUpdateSerializer
)
from .serializers import SessionSerializer, AuditLogSerializer
from .models import Session, AuditLog
from .permissions import IsAdminOrManager

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'update_user', 'delete_user', 'deactivate', 'activate']:
            self.permission_classes = [IsAdminOrManager]
        else:
            self.permission_classes = [permissions.IsAuthenticated]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        print("Creating user with data:", request.data)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        headers = self.get_success_headers(serializer.data)
        return Response({
            'user': UserSerializer(user, context=self.get_serializer_context()).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['patch'], url_path='update')
    def update_user(self, request, pk=None):
        user = self.get_object()
        if user.is_superuser and not request.user.is_superuser:
            return Response({"error": "Only superusers can update other superusers."}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['delete'], url_path='delete')
    def delete_user(self, request, pk=None):
        user = self.get_object()
        if user.id == request.user.id:
            return Response({"error": "You cannot delete your own account."}, status=status.HTTP_403_FORBIDDEN)
        if user.is_superuser and not request.user.is_superuser:
            return Response({"error": "Only superusers can delete other superusers."}, status=status.HTTP_403_FORBIDDEN)
        
        user.delete()
        return Response({"message": "User deleted successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        user = self.get_object()
        if user.id == request.user.id:
            return Response({"error": "You cannot deactivate your own account."}, status=status.HTTP_403_FORBIDDEN)
        
        user.is_active = False
        user.save()
        return Response({"message": "User deactivated successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({"message": "User activated successfully."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='profile')
    def get_user_profile(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['put', 'patch'], url_path='profile/update')
    def update_profile(self, request):
        user = request.user
        serializer = UserProfileUpdateSerializer(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(user, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='profile/change-password')
    def change_password(self, request):
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


    @action(detail=False, methods=['get'], url_path='role/(?P<role>[^/.]+)')
    def list_users_by_role(self, request, role=None):
        valid_roles = [choice[0] for choice in User.Role.choices]
        if role not in valid_roles:
            return Response(
                {"error": f"Invalid role. Valid roles are: {', '.join(valid_roles)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = User.objects.filter(role=role)
        serializer = UserSerializer(users, many=True, context={'request': request})
        return Response(serializer.data)




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_picture(request):
    """Accepts multipart/form-data with `profile_picture` file and updates current user's picture."""
    user = request.user
    if 'profile_picture' not in request.FILES:
        return Response({'error': 'No profile_picture file provided.'}, status=status.HTTP_400_BAD_REQUEST)
    file = request.FILES['profile_picture']
    user.profile_picture = file
    user.save(update_fields=['profile_picture'])
    serializer = UserSerializer(user, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


class AuthViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'], url_path='login', permission_classes=[permissions.AllowAny])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            refresh = RefreshToken.for_user(user)

            # Create a session record for this login
            try:
                jti = str(refresh.get('jti', '')) if hasattr(refresh, 'get') else ''
            except Exception:
                jti = ''

            user_agent = request.META.get('HTTP_USER_AGENT', '')
            ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
            expires_at_val = None
            try:
                exp_ts = refresh.get('exp') if hasattr(refresh, 'get') else None
                if exp_ts:
                    expires_at_val = datetime.fromtimestamp(int(exp_ts), tz=timezone.utc)
            except Exception:
                expires_at_val = None

            session = Session.objects.create(
                user=user,
                jti=jti,
                refresh_token=str(refresh),
                user_agent=user_agent[:500],
                ip_address=str(ip) if ip else None,
                device_name=None,
                expires_at=expires_at_val
            )

            # Log the login event
            AuditLog.objects.create(user=user, action='login', resource_type='user', resource_id=str(user.id), ip_address=ip, user_agent=user_agent, severity='info')

            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='logout')
    def logout(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
                # mark any session with this refresh token as revoked
                Session.objects.filter(refresh_token=refresh_token).update(is_revoked=True)
                AuditLog.objects.create(user=request.user, action='logout', resource_type='user', resource_id=str(request.user.id), ip_address=request.META.get('REMOTE_ADDR'), user_agent=request.META.get('HTTP_USER_AGENT', ''), severity='info')
            return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=False, methods=['get'], url_path='profile/sessions')
    def list_sessions(self, request):
        sessions = Session.objects.filter(user=request.user).order_by('-created_at')
        serializer = SessionSerializer(sessions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='profile/sessions/(?P<session_id>[^/.]+)/revoke')
    def revoke_session(self, request, session_id=None):
        try:
            session = Session.objects.get(id=session_id, user=request.user)
        except Session.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        session.is_revoked = True
        session.save(update_fields=['is_revoked'])

        # Try to blacklist refresh token if present
        if session.refresh_token:
            try:
                RefreshToken(session.refresh_token).blacklist()
            except Exception:
                pass

        AuditLog.objects.create(user=request.user, action='revoke_session', resource_type='session', resource_id=str(session.id), ip_address=request.META.get('REMOTE_ADDR'), user_agent=request.META.get('HTTP_USER_AGENT', ''), severity='warning')

        return Response({'message': 'Session revoked'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='profile/sessions/revoke-all')
    def revoke_all_sessions(self, request):
        sessions = Session.objects.filter(user=request.user, is_revoked=False)
        for s in sessions:
            s.is_revoked = True
            s.save(update_fields=['is_revoked'])
            if s.refresh_token:
                try:
                    RefreshToken(s.refresh_token).blacklist()
                except Exception:
                    pass
        AuditLog.objects.create(user=request.user, action='revoke_all_sessions', resource_type='user', resource_id=str(request.user.id), ip_address=request.META.get('REMOTE_ADDR'), user_agent=request.META.get('HTTP_USER_AGENT', ''), severity='warning')
        return Response({'message': 'All sessions revoked'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='audit/logs', permission_classes=[IsAdminOrManager])
    def list_audit_logs(self, request):
        """Admin endpoint to list audit logs with optional filters."""
        qs = AuditLog.objects.all()
        user_id = request.query_params.get('user')
        action = request.query_params.get('action')
        since = request.query_params.get('since')
        until = request.query_params.get('until')

        if user_id:
            qs = qs.filter(user__id=user_id)
        if action:
            qs = qs.filter(action__icontains=action)
        try:
            if since:
                qs = qs.filter(created_at__gte=since)
            if until:
                qs = qs.filter(created_at__lte=until)
        except Exception:
            pass

        qs = qs.order_by('-created_at')[:1000]
        serializer = AuditLogSerializer(qs, many=True)
        return Response(serializer.data)


class UserListViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='technicians')
    def list_technicians(self, request):
        technicians = User.objects.filter(role='Technician', is_active=True)
        serializer = UserSerializer(technicians, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='workshop-technicians')
    def list_workshop_technicians(self, request):
        technicians = User.objects.filter(is_workshop=True, is_active=True)
        serializer = UserSerializer(technicians, many=True, context={'request': request})
        return Response(serializer.data)
