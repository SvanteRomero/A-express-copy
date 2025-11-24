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
    
    path('', include(router.urls)),
    path('', include(list_router.urls)),
    path('', include(auth_router.urls)),
    # Expose profile upload endpoint expected by frontend: /api/profile/upload-picture/
    path('profile/upload-picture/', views.upload_profile_picture, name='upload_profile_picture'),

    # Additional explicit routes so frontend can call /api/users/profile/sessions/
    path('users/profile/sessions/', views.AuthViewSet.as_view({'get': 'list_sessions'}), name='users_profile_sessions'),
    path('users/profile/sessions/revoke-all/', views.AuthViewSet.as_view({'post': 'revoke_all_sessions'}), name='users_profile_sessions_revoke_all'),
    path('users/profile/sessions/<uuid:session_id>/revoke/', views.AuthViewSet.as_view({'post': 'revoke_session'}), name='users_profile_session_revoke'),
]
