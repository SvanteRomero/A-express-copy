from rest_framework import views, permissions, status
from rest_framework.response import Response
from .models import SystemSettings
from .serializers import SystemSettingsSerializer


class SystemSettingsView(views.APIView):
    """
    API endpoint to retrieve and update system settings.
    GET: Returns current settings
    PATCH: Updates settings (Manager/Admin only)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        settings = SystemSettings.get_settings()
        serializer = SystemSettingsSerializer(settings)
        return Response(serializer.data)

    def patch(self, request):
        # Only managers and admins can modify settings
        if request.user.role not in ['Manager', 'Administrator']:
            return Response(
                {'error': 'Only managers and administrators can modify settings'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        settings = SystemSettings.get_settings()
        serializer = SystemSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
