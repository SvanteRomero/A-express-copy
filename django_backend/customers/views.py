from rest_framework import viewsets, permissions
from .models import Customer, Referrer
from .serializers import CustomerSerializer, ReferrerSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('query', '')
        if query:
            customers = self.get_queryset().filter(
                Q(name__icontains=query) |
                Q(phone_numbers__phone_number__icontains=query)
            ).distinct().order_by('name')
        else:
            customers = self.get_queryset().none()
        serializer = self.get_serializer(customers, many=True)
        return Response(serializer.data)

class ReferrerViewSet(viewsets.ModelViewSet):
    queryset = Referrer.objects.all()
    serializer_class = ReferrerSerializer
    permission_classes = [permissions.IsAuthenticated]
