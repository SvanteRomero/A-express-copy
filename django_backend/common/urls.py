from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'locations', views.LocationViewSet, basename='location')
router.register(r'brands', views.BrandViewSet, basename='brand')
router.register(r'models', views.ModelViewSet, basename='model')

urlpatterns = [
    path('', include(router.urls)),
]
