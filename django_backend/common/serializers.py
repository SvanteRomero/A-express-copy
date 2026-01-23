from rest_framework import serializers
from .models import Brand, Location, Model


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name']


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'name', 'is_workshop', 'is_active']


class ModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Model
        fields = ['id', 'name', 'brand']
