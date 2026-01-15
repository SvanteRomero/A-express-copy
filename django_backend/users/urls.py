from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')

list_router = DefaultRouter()
list_router.register(r'list', views.UserListViewSet, basename='list')

auth_router = DefaultRouter()
auth_router.register(r'', views.AuthViewSet, basename='auth')

urlpatterns = [
    # Authentication endpoints
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # CSRF token endpoint for frontend
    path('csrf/', views.get_csrf_token, name='csrf_token'),
    
    # Cookie-based token refresh
    path('auth/refresh/', views.refresh_token_cookie, name='token_refresh_cookie'),
    
    # Current user endpoint (uses cookie auth)
    path('auth/me/', views.get_current_user, name='auth_me'),
    
    # WebSocket token endpoint (for WS authentication)
    path('auth/ws-token/', views.get_websocket_token, name='auth_ws_token'),
    
    path('', include(router.urls)),
    path('', include(list_router.urls)),
    path('', include(auth_router.urls)),
    # Expose profile upload endpoint expected by frontend: /api/profile/upload-picture/
    path('profile/upload-picture/', views.upload_profile_picture, name='upload_profile_picture'),

    # Additional explicit routes so frontend can call /api/users/profile/sessions/
    path('users/profile/sessions/', views.AuthViewSet.as_view({'get': 'list_sessions'}), name='users_profile_sessions'),
    path('users/profile/sessions/revoke-all/', views.AuthViewSet.as_view({'post': 'revoke_all_sessions'}), name='users_profile_sessions_revoke_all'),
    path('users/profile/sessions/<uuid:session_id>/revoke/', views.AuthViewSet.as_view({'post': 'revoke_session'}), name='users_profile_session_revoke'),
    path('users/profile/activity/', views.AuthViewSet.as_view({'get': 'profile_activity'}), name='users_profile_activity'),
    
    # Technician Dashboard Stats
    path('technician-dashboard-stats/', views.TechnicianDashboardStats.as_view(), name='technician-dashboard-stats'),
]

