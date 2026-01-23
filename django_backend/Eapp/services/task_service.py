"""
Task Service Layer

Contains the core business logic for task creation and updates,
separated from the view layer for better testability and maintainability.
"""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from common.models import Model
from customers.models import Referrer
from financials.models import Payment, PaymentMethod
from users.models import User
from Eapp.models import Task
from Eapp.utils.status_transitions import can_transition
from Eapp.utils import TaskIDGenerator
from .activity_logger import ActivityLogger
from customers.services import CustomerHandler
from .workshop_handler import WorkshopHandler


class TaskCreationService:
    """
    Service for creating new tasks with all associated business logic.
    """
    
    @staticmethod
    def create_task(data, user):
        """
        Create a new task with all associated entities.
        
        This method handles:
        - Generating task ID
        - Creating/updating customer
        - Creating/retrieving laptop model
        - Creating/retrieving referrer
        - Setting initial status based on assignment
        - Creating initial activity logs
        
        Args:
            data (dict): Task creation data
            user: User creating the task
            
        Returns:
            tuple: (task_instance, customer_created_flag)
        """
        # Generate task ID
        data['title'] = TaskIDGenerator.generate()
        
        # Handle customer creation/update
        customer_data = data.pop('customer', None)
        customer, customer_created = CustomerHandler.create_or_update_customer(customer_data)
        if customer:
            data['customer'] = customer.id
        
        # Handle laptop model creation/retrieval
        laptop_model_name = data.pop('laptop_model', None)
        brand_id = data.get('brand', None)
        if laptop_model_name and brand_id:
            model, _ = Model.objects.get_or_create(
                name=laptop_model_name,
                brand_id=brand_id
            )
            data['laptop_model'] = model.id
        
        # Handle referrer
        referred_by_name = data.pop("referred_by", None)
        is_referred = data.get("is_referred", False)
        referrer_obj = None
        if is_referred and referred_by_name:
            referrer_obj, _ = Referrer.objects.get_or_create(name=referred_by_name)
        
        # Apply business logic for status
        if data.get("assigned_to"):
            data["status"] = "In Progress"
        else:
            data["status"] = "Pending"
        
        # Set initial total_cost from estimated_cost
        if 'estimated_cost' in data:
            data['total_cost'] = data['estimated_cost']
        
        return data, customer_created, referrer_obj
    
    @staticmethod
    def create_initial_activities(task, user, device_notes=None):
        """
        Create initial activity logs for a new task.
        
        Args:
            task: Task instance
            user: User who created the task
            device_notes: Optional device notes
        """
        # Log intake
        ActivityLogger.log_intake(task, user)
        
        # Log device notes if provided
        if device_notes:
            ActivityLogger.log_device_note(task, user, device_notes)
        
        # Log assignment if tech was assigned
        if task.assigned_to:
            ActivityLogger.log_assignment(task, user, None, task.assigned_to)


class TaskUpdateService:
    """
    Service for updating tasks with all associated business logic.
    """
    
    @staticmethod
    def update_task(task, data, user):
        """
        Update a task with business logic handling.
        
        This method handles:
        - Customer updates
        - Partial payment creation
        - Referrer updates
        - Status assignment based on technician
        - Payment status updates (for accountants)
        - Workshop operations
        - Status transitions with permissions
        - Activity logging
        
        Args:
            task: Task instance to update
            data (dict): Update data
            user: User performing the update
            
        Returns:
            dict: Processed data ready for serializer or Response with error
        """
        import logging
        logger = logging.getLogger(__name__)
        
        logger.warning(f"[SERVICE DEBUG] Starting update_task for {task.title}")
        logger.warning(f"[SERVICE DEBUG] User: {user.username} ({user.role})")
        logger.warning(f"[SERVICE DEBUG] Data keys: {list(data.keys())}")
        
        # Store original values for comparison
        original_assigned_to = task.assigned_to
        
        logger.warning(f"[SERVICE DEBUG] Handling customer update")
        # Handle customer update
        customer_data = data.pop('customer', None)
        if customer_data:
            CustomerHandler.update_customer(task.customer, customer_data)
        
        logger.warning(f"[SERVICE DEBUG] Handling partial payment")
        # Handle partial payment
        partial_payment_amount = data.pop("partial_payment_amount", None)
        if partial_payment_amount is not None:
            payment_method, _ = PaymentMethod.objects.get_or_create(name="Partial Payment")
            Payment.objects.create(
                task=task,
                amount=partial_payment_amount,
                method=payment_method
            )
        
        logger.warning(f"[SERVICE DEBUG] Handling referrer")
        # Handle referrer
        referred_by_name = data.pop("referred_by", None)
        is_referred = data.get("is_referred", task.is_referred)
        referrer_obj = task.referred_by
        
        if is_referred:
            if referred_by_name:
                referrer_obj, _ = Referrer.objects.get_or_create(name=referred_by_name)
        else:
            referrer_obj = None
        
        logger.warning(f"[SERVICE DEBUG] Applying business logic for status based on assignment")
        logger.warning(f"[SERVICE DEBUG] 'assigned_to' in data: {'assigned_to' in data}")
        # Apply business logic for status based on assignment
        if "assigned_to" in data:
            logger.warning(f"[SERVICE DEBUG] assigned_to value: {data.get('assigned_to')}")
            if data["assigned_to"]:
                logger.warning(f"[SERVICE DEBUG] Setting status to 'In Progress'")
                data["status"] = "In Progress"
            else:
                logger.warning(f"[SERVICE DEBUG] Setting status to 'Pending'")
                data["status"] = "Pending"
        
        logger.warning(f"[SERVICE DEBUG] Handling payment status (accountant only)")
        # Handle payment status update (accountant only)
        if user.role == 'Accountant' and 'payment_status' in data:
            task.payment_status = data['payment_status']
            task.save(update_fields=['payment_status'])
        
        logger.warning(f"[SERVICE DEBUG] Handling workshop operations")
        # Handle workshop operations
        workshop_response = TaskUpdateService._handle_workshop_operations(
            task, data, user
        )
        if workshop_response:
            logger.warning(f"[SERVICE DEBUG] Workshop handler returned response")
            return workshop_response
        
        logger.warning(f"[SERVICE DEBUG] Handling status transitions")
        logger.warning(f"[SERVICE DEBUG] Current task status: {task.status}")
        logger.warning(f"[SERVICE DEBUG] New status in data: {data.get('status', 'NOT SET')}")
        # Handle status transitions
        status_response = TaskUpdateService._handle_status_transition(
            task, data, user, original_assigned_to
        )
        if status_response:
            logger.warning(f"[SERVICE DEBUG] Status transition handler returned response: {status_response.status_code}")
            return status_response
        
        logger.warning(f"[SERVICE DEBUG] Returning success dict")
        return {
            'data': data,
            'referrer_obj': referrer_obj,
            'original_assigned_to': original_assigned_to
        }
    
    @staticmethod
    def _handle_workshop_operations(task, data, user):
        """
        Handle workshop send/return operations.
        
        Returns Response object if there's an error, None otherwise.
        """
        # Handle workshop send
        if 'workshop_location' in data:
            WorkshopHandler.send_to_workshop(
                task,
                data.get('workshop_location'),
                user
            )
        
        # Handle workshop return
        if data.get('workshop_status') in ['Solved', 'Not Solved']:
            WorkshopHandler.return_from_workshop(
                task,
                data['workshop_status'],
                user
            )
        
        return None
    
    @staticmethod
    def _handle_status_transition(task, data, user, original_assigned_to):
        """
        Handle status transitions with permission checks and activity logging.
        
        Returns Response object if there's an error, None otherwise.
        """
        if 'status' not in data:
            return None
        
        new_status = data['status']
        
        # Check if transition is allowed
        if not can_transition(user, task, new_status):
            return Response(
                {"error": f"As a {user.role}, you cannot change status from '{task.status}' to '{new_status}'."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Handle rejection (special case - don't log normal status change)
        if new_status == 'In Progress' and 'qc_notes' in data and data['qc_notes']:
            ActivityLogger.log_rejection(task, user, data['qc_notes'])
            
            # Handle returned task assignment
            if user.role == 'Front Desk' and data.get('assigned_to'):
                technician = get_object_or_404(User, id=data.get('assigned_to'), role='Technician')
                ActivityLogger.log_returned_task_assignment(task, user, technician)
            
            return None  # Prevent other status update logs
        
        # Log standard status changes
        ActivityLogger.log_status_change(task, user, new_status)
        
        # Handle returned task assignment (when not a rejection)
        if new_status == 'In Progress' and user.role == 'Front Desk':
            technician_id = data.get('assigned_to')
            if technician_id:
                technician = get_object_or_404(User, id=technician_id, role='Technician')
                task.assigned_to = technician
                ActivityLogger.log_returned_task_assignment(task, user, technician)
        
        return None
    
    @staticmethod
    def create_update_activities(task, data, user, original_assigned_to):
        """
        Create activity logs for task updates.
        
        Args:
            task: Updated task instance
            data: Update data
            user: User who performed the update
            original_assigned_to: Original assigned technician (for comparison)
        """
        # Log debt marking
        if data.get('is_debt') is True:
            ActivityLogger.log_debt_marking(task, user)
        
        # Log assignment changes (if not already logged in status transition)
        if 'assigned_to' in data:
            new_technician_id = data.get('assigned_to')
            
            if new_technician_id:
                new_technician = get_object_or_404(User, id=new_technician_id)
                if original_assigned_to != new_technician:
                    ActivityLogger.log_assignment(task, user, original_assigned_to, new_technician)
            else:
                if original_assigned_to:
                    ActivityLogger.log_assignment(task, user, original_assigned_to, None)
