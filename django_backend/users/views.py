from rest_framework import status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
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
from .authentication import set_jwt_cookies, clear_jwt_cookies
from Eapp.models import TaskActivity
from .permissions import IsAdminOrManager
from django.conf import settings

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
        
        # Handle password update if provided
        password = request.data.get('password')
        if password:
            if len(password) < 8:
                 return Response({"error": "Password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(password)
            user.save()

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
        # Pass request context for django-axes authentication
        serializer = LoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            
            # H-04 FIX: Revoke all previous sessions to prevent session fixation
            Session.objects.filter(user=user, is_revoked=False).update(is_revoked=True)
            
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
                refresh_token_hash=Session.hash_token(str(refresh)),
                user_agent=user_agent[:500],
                ip_address=str(ip) if ip else None,
                device_name=None,
                expires_at=expires_at_val
            )

            # Log the login event
            AuditLog.objects.create(user=user, action='login', resource_type='user', resource_id=str(user.id), ip_address=ip, user_agent=user_agent, severity='info')

            # Create response with user data (no tokens in body for security)
            response = Response({
                'user': UserSerializer(user).data,
                'message': 'Login successful',
            })
            
            # Set JWT tokens as HttpOnly cookies
            response = set_jwt_cookies(
                response,
                str(refresh.access_token),
                str(refresh)
            )
            
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='logout')
    def logout(self, request):
        try:
            # Try to get refresh token from cookie first, then from request body
            refresh_token = request.COOKIES.get(settings.JWT_AUTH_REFRESH_COOKIE) or request.data.get('refresh_token')
            
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                except Exception:
                    pass  # Token may already be blacklisted or invalid
                
                # Mark session as revoked using token hash
                token_hash = Session.hash_token(refresh_token)
                Session.objects.filter(refresh_token_hash=token_hash).update(is_revoked=True)
                
                if request.user.is_authenticated:
                    AuditLog.objects.create(
                        user=request.user, 
                        action='logout', 
                        resource_type='user', 
                        resource_id=str(request.user.id), 
                        ip_address=request.META.get('REMOTE_ADDR'), 
                        user_agent=request.META.get('HTTP_USER_AGENT', ''), 
                        severity='info'
                    )
            
            # Clear JWT cookies
            response = Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
            response = clear_jwt_cookies(response)
            return response
            
        except Exception as e:
            # Still clear cookies even on error
            response = Response({"error": "Logout failed. Please try again."}, status=status.HTTP_400_BAD_REQUEST)
            response = clear_jwt_cookies(response)
            return response


    @action(detail=False, methods=['get'], url_path='profile/sessions')
    def list_sessions(self, request):
        # Only show active (non-revoked) sessions - revoked ones are kept for audit
        sessions = Session.objects.filter(user=request.user, is_revoked=False).order_by('-created_at')
        # Pass request context so serializer can determine current session
        serializer = SessionSerializer(sessions, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='profile/sessions/(?P<session_id>[^/.]+)/revoke')
    def revoke_session(self, request, session_id=None):
        try:
            session = Session.objects.get(id=session_id, user=request.user)
        except Session.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check if this is the current session
        is_current_session = False
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            token = request.COOKIES.get(settings.JWT_AUTH_COOKIE)
            if token:
                access_token = AccessToken(token)
                current_jti = str(access_token.get('jti', ''))
                is_current_session = session.jti == current_jti
        except Exception:
            pass

        session.is_revoked = True
        session.save(update_fields=['is_revoked'])

        # Sessions are revoked by marking is_revoked=True
        # We no longer store raw tokens, so we can't blacklist from stored token
        # The JWT blacklist is done client-side on logout

        AuditLog.objects.create(user=request.user, action='revoke_session', resource_type='session', resource_id=str(session.id), ip_address=request.META.get('REMOTE_ADDR'), user_agent=request.META.get('HTTP_USER_AGENT', ''), severity='warning')

        # If revoking current session, clear cookies and indicate logout required
        if is_current_session:
            response = Response({
                'message': 'Current session revoked',
                'logout_required': True
            }, status=status.HTTP_200_OK)
            response = clear_jwt_cookies(response)
            return response

        return Response({'message': 'Session revoked', 'logout_required': False}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='profile/sessions/revoke-all')
    def revoke_all_sessions(self, request):
        sessions = Session.objects.filter(user=request.user, is_revoked=False)
        for s in sessions:
            s.is_revoked = True
            s.save(update_fields=['is_revoked'])
            # We no longer store raw tokens, blacklisting is done client-side on logout
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

    @action(detail=False, methods=['get'], url_path='profile/activity')
    def profile_activity(self, request):
        """Merged timeline for the current user combining AuditLog and a filtered set of TaskActivity entries.

        Returns a time-ordered list of recent events authored by the user.
        Query params: page, page_size, category (audit|task|all), since, until
        """
        # Params
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 25))
        category = request.query_params.get('category', 'all')
        since = request.query_params.get('since')
        until = request.query_params.get('until')

        # Keep the set of TaskActivity types small and important for profile timeline
        IMPORTANT_TASK_TYPES = [
            TaskActivity.ActivityType.ASSIGNMENT,
            TaskActivity.ActivityType.PICKED_UP,
            TaskActivity.ActivityType.RETURNED,
            TaskActivity.ActivityType.WORKSHOP,
            TaskActivity.ActivityType.READY,
            TaskActivity.ActivityType.STATUS_UPDATE,
        ]

        fetch_factor = 2
        fetch_limit = page_size * fetch_factor

        # Audit logs authored by the user
        audit_qs = AuditLog.objects.filter(user=request.user)
        if since:
            audit_qs = audit_qs.filter(created_at__gte=since)
        if until:
            audit_qs = audit_qs.filter(created_at__lte=until)
        audit_list = []
        if category in ('all', 'audit'):
            audit_items = audit_qs.order_by('-created_at')[:fetch_limit]
            for a in audit_items:
                audit_list.append({
                    'id': f'audit-{a.id}',
                    'timestamp': a.created_at,
                    'source': 'audit',
                    'category': 'audit',
                    'message': a.action,
                    'severity': a.severity,
                    'metadata': a.metadata,
                    'related_task': None,
                    'user': a.user.username if a.user else None,
                })

        # Task activities authored by the user (filtered set)
        task_list = []
        if category in ('all', 'task'):
            task_qs = TaskActivity.objects.filter(user=request.user, type__in=IMPORTANT_TASK_TYPES)
            if since:
                task_qs = task_qs.filter(timestamp__gte=since)
            if until:
                task_qs = task_qs.filter(timestamp__lte=until)
            task_items = task_qs.select_related('task').order_by('-timestamp')[:fetch_limit]
            for t in task_items:
                task_list.append({
                    'id': f'task-{t.id}',
                    'timestamp': t.timestamp,
                    'source': 'task',
                    'category': 'task',
                    'message': t.message,
                    'severity': 'info',
                    'metadata': t.details,
                    'related_task': {'id': t.task.id, 'title': t.task.title} if getattr(t, 'task', None) else None,
                    'user': t.user.username if t.user else None,
                })

        # Merge and sort
        merged = sorted(audit_list + task_list, key=lambda x: x['timestamp'], reverse=True)

        # Simple pagination on merged results
        start = (page - 1) * page_size
        end = start + page_size
        page_items = merged[start:end]

        # Convert timestamps to ISO strings for JSON
        for item in page_items:
            item['timestamp'] = item['timestamp'].isoformat()

        has_more = end < len(merged)

        return Response({
            'page': page,
            'page_size': page_size,
            'has_more': has_more,
            'results': page_items,
        })


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


# =============================================================================
# Cookie Authentication Endpoints
# =============================================================================

from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Endpoint to get CSRF token for form submissions.
    
    The @ensure_csrf_cookie decorator ensures the CSRF cookie is set.
    Frontend should call this endpoint before making POST/PUT/DELETE requests.
    """
    return Response({
        'csrfToken': get_token(request),
        'message': 'CSRF cookie set'
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def refresh_token_cookie(request):
    """
    Refresh access token using the refresh token from HttpOnly cookie.
    
    This is the cookie-based alternative to /token/refresh/
    """
    refresh_token = request.COOKIES.get(settings.JWT_AUTH_REFRESH_COOKIE)
    
    if not refresh_token:
        return Response(
            {'error': 'No refresh token found. Please log in again.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        refresh = RefreshToken(refresh_token)
        new_access_token = str(refresh.access_token)
        
        # Create response
        response = Response({'message': 'Token refreshed successfully'})
        
        # Set new access token cookie
        response = set_jwt_cookies(response, new_access_token)
        
        # If token rotation is enabled, also set new refresh token
        if settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS', False):
            response = set_jwt_cookies(response, new_access_token, str(refresh))
        
        return response
        
    except (InvalidToken, TokenError) as e:
        # Clear cookies if refresh fails
        response = Response(
            {'error': 'Session expired. Please log in again.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
        response = clear_jwt_cookies(response)
        return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    Get the currently authenticated user's information.
    
    This endpoint uses cookie-based authentication.
    Frontend can call this on page load to check if user is authenticated.
    """
    serializer = UserSerializer(request.user, context={'request': request})
    return Response({
        'user': serializer.data,
        'authenticated': True
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_websocket_token(request):
    """
    Generate a short-lived access token for WebSocket authentication.
    
    Since WebSockets can't use HttpOnly cookies, we need to provide
    a token that the frontend can pass as a query parameter.
    The token is short-lived (5 minutes) for security.
    """
    from rest_framework_simplejwt.tokens import AccessToken
    from datetime import timedelta
    
    # Create a short-lived access token (5 minutes)
    token = AccessToken.for_user(request.user)
    token.set_exp(lifetime=timedelta(minutes=5))
    
    return Response({
        'token': str(token),
        'expires_in': 300,  # 5 minutes in seconds
    })


# =============================================================================
# Technician Dashboard Stats
# =============================================================================

from rest_framework.views import APIView
from Eapp.models import Task


class TechnicianDashboardStats(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        
        # 1. Assigned Tasks (Pending)
        assigned_count = Task.objects.filter(assigned_to=user, status="Pending").count()
        
        # 2. In Progress Tasks
        in_progress_count = Task.objects.filter(assigned_to=user, status="In Progress").count()
        
        # 3. Completed Today
        completed_today_count = Task.objects.filter(
            assigned_to=user,
            status="Completed",
            updated_at__date=today
        ).count()
        
        # 4. Urgent Tasks (Active + Yupo/Ina Haraka)
        urgent_count = Task.objects.filter(
            assigned_to=user,
            urgency__in=["Yupo", "Ina Haraka"]
        ).exclude(
             status__in=["Completed", "Picked Up", "Terminated", "Ready for Pickup"]
        ).count()

        # 5. Recent Activity (Last 5 updated tasks for this user)
        recent_tasks_qs = Task.objects.filter(assigned_to=user).order_by('-updated_at')[:5]
        recent_tasks_data = []
        for t in recent_tasks_qs:
             recent_tasks_data.append({
                 "id": t.title,
                 "title": t.title,
                 "laptop_model_name": t.laptop_model.name if t.laptop_model else "Device",
                 "status": t.status
             })

        data = {
            "assigned_count": assigned_count,
            "in_progress_count": in_progress_count,
            "completed_today_count": completed_today_count,
            "urgent_count": urgent_count,
            "recent_tasks": recent_tasks_data
        }
        return Response(data)
