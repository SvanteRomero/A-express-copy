from rest_framework import serializers
from .models import Customer, PhoneNumber, Referrer
from django.db import transaction

class PhoneNumberSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhoneNumber
        fields = ['id', 'phone_number']


class CustomerSerializer(serializers.ModelSerializer):
    phone_numbers = PhoneNumberSerializer(many=True)
    has_debt = serializers.ReadOnlyField()
    tasks_count = serializers.ReadOnlyField()

    class Meta:
        model = Customer
        fields = ['id', 'name', 'customer_type', 'phone_numbers', 'has_debt', 'tasks_count']

    def create(self, validated_data):
        phone_numbers_data = validated_data.pop('phone_numbers')
        customer = Customer.objects.create(**validated_data)
        for phone_number_data in phone_numbers_data:
            PhoneNumber.objects.create(customer=customer, **phone_number_data)
        return customer

    def update(self, instance, validated_data):
        phone_numbers_data = validated_data.pop('phone_numbers', [])
        instance.name = validated_data.get('name', instance.name)
        instance.customer_type = validated_data.get('customer_type', instance.customer_type)
        instance.save()

        with transaction.atomic():
            # Separate new and existing phone numbers
            new_phone_numbers = []
            existing_phone_numbers_data = []
            for pn_data in phone_numbers_data:
                if 'id' in pn_data:
                    existing_phone_numbers_data.append(pn_data)
                else:
                    new_phone_numbers.append(PhoneNumber(customer=instance, **pn_data))

            # Bulk create new phone numbers
            if new_phone_numbers:
                PhoneNumber.objects.bulk_create(new_phone_numbers)

            # Bulk update existing phone numbers
            if existing_phone_numbers_data:
                pns_to_update = []
                for pn_data in existing_phone_numbers_data:
                    pn = PhoneNumber.objects.get(id=pn_data['id'], customer=instance)
                    pn.phone_number = pn_data.get('phone_number', pn.phone_number)
                    pns_to_update.append(pn)
                PhoneNumber.objects.bulk_update(pns_to_update, ['phone_number'])
            
            # Delete phone numbers that are not in the payload
            phone_ids_to_keep = [pn['id'] for pn in existing_phone_numbers_data if 'id' in pn]
            instance.phone_numbers.exclude(id__in=phone_ids_to_keep).delete()

        return instance


class ReferrerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Referrer
        fields = ['id', 'name', 'phone']


class CustomerListSerializer(serializers.ModelSerializer):
    phone_numbers = PhoneNumberSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = ['name', 'phone_numbers']