from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from customers.models import Customer, PhoneNumber
from Eapp.models import User

class CustomerAPITests(APITestCase):
    def setUp(self):
        # Create a user
        self.user = User.objects.create_user(username='testuser', password='testpassword', email='test@gmail.com', first_name='test', last_name='user', role='Manager')
        self.client.force_authenticate(user=self.user)
        # Create some test customers
        customer1 = Customer.objects.create(name='Test Customer 1')
        PhoneNumber.objects.create(customer=customer1, phone_number='1234567890')
        customer2 = Customer.objects.create(name='Test Customer 2')
        PhoneNumber.objects.create(customer=customer2, phone_number='0987654321')

    def test_customer_search(self):
        """
        Ensure we can search for customers.
        """
        url = reverse('customer-search')
        response = self.client.get(url, {'query': 'Test'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)