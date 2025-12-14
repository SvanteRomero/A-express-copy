from rest_framework import serializers
from .models import Customer, PhoneNumber, Referrer
from django.db import transaction
from common.encryption import encrypt_value, decrypt_value, is_encrypted


class PhoneNumberSerializer(serializers.ModelSerializer):
    # Override to handle decryption on read
    phone_number = serializers.SerializerMethodField()
    
    class Meta:
        model = PhoneNumber
        fields = ['id', 'phone_number']
    
    def get_phone_number(self, obj):
        """Decrypt phone number when serializing."""
        if obj.phone_number:
            return decrypt_value(obj.phone_number)
        return obj.phone_number


class PhoneNumberWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating phone numbers with encryption."""
    
    class Meta:
        model = PhoneNumber
        fields = ['id', 'phone_number']
    
    def create(self, validated_data):
        # Encrypt phone number before saving
        if 'phone_number' in validated_data and validated_data['phone_number']:
            validated_data['phone_number'] = encrypt_value(validated_data['phone_number'])
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Encrypt phone number before saving
        if 'phone_number' in validated_data and validated_data['phone_number']:
            validated_data['phone_number'] = encrypt_value(validated_data['phone_number'])
        return super().update(instance, validated_data)


class CustomerSerializer(serializers.ModelSerializer):
    phone_numbers = PhoneNumberSerializer(many=True, read_only=True)
    phone_numbers_write = PhoneNumberWriteSerializer(many=True, write_only=True, required=False, source='phone_numbers')
    has_debt = serializers.ReadOnlyField()
    tasks_count = serializers.ReadOnlyField()

    class Meta:
        model = Customer
        fields = ['id', 'name', 'customer_type', 'phone_numbers', 'phone_numbers_write', 'has_debt', 'tasks_count']

    def create(self, validated_data):
        phone_numbers_data = validated_data.pop('phone_numbers', [])
        customer = Customer.objects.create(**validated_data)
        for phone_number_data in phone_numbers_data:
            # Encrypt phone number before saving
            phone = phone_number_data.get('phone_number', '')
            if phone:
                phone = encrypt_value(phone)
            PhoneNumber.objects.create(customer=customer, phone_number=phone)
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
                    # Encrypt new phone numbers
                    phone = pn_data.get('phone_number', '')
                    if phone:
                        phone = encrypt_value(phone)
                    new_phone_numbers.append(PhoneNumber(customer=instance, phone_number=phone))

            # Bulk create new phone numbers
            if new_phone_numbers:
                PhoneNumber.objects.bulk_create(new_phone_numbers)

            # Update existing phone numbers
            if existing_phone_numbers_data:
                pns_to_update = []
                for pn_data in existing_phone_numbers_data:
                    pn = PhoneNumber.objects.get(id=pn_data['id'], customer=instance)
                    if 'phone_number' in pn_data:
                        pn.phone_number = encrypt_value(pn_data['phone_number'])
                    pns_to_update.append(pn)
                PhoneNumber.objects.bulk_update(pns_to_update, ['phone_number'])
            
            # Delete phone numbers that are not in the payload
            phone_ids_to_keep = [pn['id'] for pn in existing_phone_numbers_data if 'id' in pn]
            instance.phone_numbers.exclude(id__in=phone_ids_to_keep).delete()

        return instance


class ReferrerSerializer(serializers.ModelSerializer):
    # Decrypt phone on read
    phone = serializers.SerializerMethodField()
    phone_write = serializers.CharField(write_only=True, required=False, allow_blank=True, source='phone')
    
    class Meta:
        model = Referrer
        fields = ['id', 'name', 'phone', 'phone_write']
    
    def get_phone(self, obj):
        """Decrypt phone when serializing."""
        if obj.phone:
            return decrypt_value(obj.phone)
        return obj.phone
    
    def create(self, validated_data):
        # Encrypt phone before saving
        if 'phone' in validated_data and validated_data['phone']:
            validated_data['phone'] = encrypt_value(validated_data['phone'])
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Encrypt phone before saving
        if 'phone' in validated_data and validated_data['phone']:
            validated_data['phone'] = encrypt_value(validated_data['phone'])
        return super().update(instance, validated_data)


class CustomerListSerializer(serializers.ModelSerializer):
    phone_numbers = PhoneNumberSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = ['name', 'phone_numbers']
