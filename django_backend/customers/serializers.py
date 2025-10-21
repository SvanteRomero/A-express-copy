from rest_framework import serializers
from .models import Customer, PhoneNumber, Referrer


class PhoneNumberSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhoneNumber
        fields = ['id', 'phone_number']


class CustomerSerializer(serializers.ModelSerializer):
    phone_numbers = PhoneNumberSerializer(many=True)

    class Meta:
        model = Customer
        fields = ['id', 'name', 'address', 'customer_type', 'phone_numbers']

    def create(self, validated_data):
        phone_numbers_data = validated_data.pop('phone_numbers')
        customer = Customer.objects.create(**validated_data)
        for phone_number_data in phone_numbers_data:
            PhoneNumber.objects.create(customer=customer, **phone_number_data)
        return customer

    def update(self, instance, validated_data):
        phone_numbers_data = validated_data.pop('phone_numbers')
        instance.name = validated_data.get('name', instance.name)
        instance.address = validated_data.get('address', instance.address)
        instance.customer_type = validated_data.get('customer_type', instance.customer_type)
        instance.save()

        # Get existing phone numbers
        existing_phone_numbers = {str(pn.id): pn for pn in instance.phone_numbers.all()}

        # Update or create phone numbers
        for phone_number_data in phone_numbers_data:
            phone_number_id = phone_number_data.get('id')
            if phone_number_id:
                # If phone number has an ID, it's an existing one
                phone_number = existing_phone_numbers.pop(str(phone_number_id), None)
                if phone_number:
                    # Update existing phone number
                    phone_number.phone_number = phone_number_data.get('phone_number', phone_number.phone_number)
                    phone_number.save()
            else:
                # If phone number has no ID, it's a new one
                PhoneNumber.objects.get_or_create(customer=instance, **phone_number_data)

        # Remove phone numbers that are no longer in the list
        for phone_number in existing_phone_numbers.values():
            phone_number.delete()

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
