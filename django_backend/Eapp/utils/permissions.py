"""
Custom DRF permission classes for Eapp.

These permission classes encapsulate role-based access control
for various task operations, replacing inline permission checks.
"""
from rest_framework import permissions


class CanCreateTask(permissions.BasePermission):
    """
    Permission to create tasks.
    
    Allowed roles:
    - Superuser
    - Manager
    - Front Desk
    """
    
    message = "You do not have permission to create tasks."
    
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return request.user.role in ['Manager', 'Front Desk']


class CanDeleteTask(permissions.BasePermission):
    """
    Permission to delete tasks.
    
    Allowed roles:
    - Superuser
    - Manager
    """
    
    message = "You do not have permission to delete tasks."
    
    def has_permission(self, request, view):
        return request.user.is_superuser or request.user.role == 'Manager'


class CanAddPayment(permissions.BasePermission):
    """
    Permission to add payments to tasks.
    
    Allowed roles:
    - Superuser
    - Manager
    - Front Desk
    - Accountant
    """
    
    message = "You do not have permission to add payments."
    
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return request.user.role in ['Manager', 'Front Desk', 'Accountant']
