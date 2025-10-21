from rest_framework import permissions, viewsets
from .models import Brand, Location
from .serializers import BrandSerializer, LocationSerializer
from users.permissions import IsManager
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response


from rest_framework.decorators import action

class LocationViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows locations to be viewed or edited.
    """
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='workshop-locations')
    def workshops(self, request):
        locations = self.get_queryset().filter(is_workshop=True)
        serializer = self.get_serializer(locations, many=True)
        return Response(serializer.data)

class BrandViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows brands to be viewed or edited.
    """
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action == 'list':
            self.permission_classes = [permissions.IsAuthenticated]
        else:
            self.permission_classes = [IsManager]
        return super().get_permissions()