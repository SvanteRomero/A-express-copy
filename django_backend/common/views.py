from rest_framework import permissions, viewsets, filters, status
from .models import Brand, Location, Model
from .serializers import BrandSerializer, LocationSerializer, ModelSerializer
from users.permissions import IsManager, IsAdminOrManagerOrFrontDesk
from rest_framework.response import Response


from rest_framework.decorators import action

class LocationViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows locations to be viewed or edited.
    Only shows active locations by default unless ?include_inactive=true.
    """
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter to show only active locations unless explicitly requested."""
        queryset = super().get_queryset()
        include_inactive = self.request.query_params.get('include_inactive', 'false').lower() == 'true'
        
        if not include_inactive:
            queryset = queryset.filter(is_active=True)
        
        return queryset

    def destroy(self, request, *args, **kwargs):
        """Soft delete: mark location as inactive instead of deleting."""
        instance = self.get_object()
        instance.delete()  # This calls our custom soft delete method
        return Response(
            {"detail": "Location deactivated successfully."},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='reactivate')
    def reactivate(self, request, pk=None):
        """Reactivate an inactive location."""
        location = self.get_object()
        if location.is_active:
            return Response(
                {"detail": "Location is already active."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        location.is_active = True
        location.save(update_fields=['is_active'])
        
        return Response(
            {"detail": "Location reactivated successfully."},
            status=status.HTTP_200_OK
        )

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
            self.permission_classes = [IsAdminOrManagerOrFrontDesk]
        return super().get_permissions()

from django_filters.rest_framework import DjangoFilterBackend

class ModelViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows models to be viewed or edited.
    """
    queryset = Model.objects.all()
    serializer_class = ModelSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'brand__name']
    filterset_fields = ['brand']