"""
Customer Handler Service

Handles customer-related operations during task creation and updates,
including customer creation, retrieval, and phone number management.
"""
from django.db import transaction
from .models import Customer
from .serializers import CustomerSerializer


class CustomerHandler:
    """Handles customer-related operations for tasks."""
    
    @staticmethod
    def create_or_update_customer(customer_data):
        """
        Create a new customer or update an existing one.
        
        This method handles the customer logic during task creation:
        - If customer_id is provided, updates the existing customer
        - Otherwise, creates a new customer
        
        Args:
            customer_data (dict): Customer data from request
            
        Returns:
            tuple: (customer_instance, created_flag)
            
        Raises:
            ValidationError: If customer data is invalid
        """
        if not customer_data:
            return None, False
        
        with transaction.atomic():
            customer = None
            customer_created = False
            customer_id = customer_data.get('id')
            
            # First, try to find customer by ID (if provided from dropdown selection)
            if customer_id:
                try:
                    customer = Customer.objects.get(id=customer_id)
                except Customer.DoesNotExist:
                    pass
            
            if customer:
                # Customer exists - update with any new data
                customer_serializer = CustomerSerializer(
                    customer, 
                    data=customer_data, 
                    partial=True
                )
                customer_serializer.is_valid(raise_exception=True)
                customer = customer_serializer.save()
            else:
                # New customer - create them
                customer_serializer = CustomerSerializer(data=customer_data)
                customer_serializer.is_valid(raise_exception=True)
                customer = customer_serializer.save()
                customer_created = True
            
            return customer, customer_created
    
    @staticmethod
    def update_customer(customer, customer_data):
        """
        Update an existing customer with new data.
        
        Args:
            customer: Customer instance to update
            customer_data (dict): New customer data
            
        Returns:
            Customer: Updated customer instance
            
        Raises:
            ValidationError: If customer data is invalid
        """
        if not customer_data:
            return customer
        
        customer_serializer = CustomerSerializer(
            customer,
            data=customer_data,
            partial=True
        )
        customer_serializer.is_valid(raise_exception=True)
        return customer_serializer.save()
