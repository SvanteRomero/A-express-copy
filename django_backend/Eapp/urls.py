from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
       path('register/', views.register_user, name='register'),
    path('login/', views.login_user, name='login'),
    path('logout/', views.logout, name='logout'),
    path('profile/', views.get_user_profile, name='profile'),
    path('profile/update/', views.update_profile, name='update-profile'),
    path('profile/upload-picture/', views.upload_profile_picture, name='upload-profile-picture'),
    path('users/', views.list_users, name='user-list'),
    path('users/<int:user_id>/', views.get_user_detail, name='user-detail'),
    path('users/<int:user_id>/update/', views.update_user, name='user-update'),
    path('users/<int:user_id>/delete/', views.delete_user, name='user-delete'),
    path('users/<int:user_id>/deactivate/', views.deactivate_user, name='user-deactivate'),
    path('users/<int:user_id>/activate/', views.activate_user, name='user-activate'),
    path('users/role/<str:role>/', views.list_users_by_role, name='users-by-role'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('change-password/', views.change_password, name='change-password'),
 ]