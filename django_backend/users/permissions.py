from rest_framework import permissions

_FRONT_DESK = 'Front Desk'


class IsAdminOrManager(permissions.BasePermission):
    """
    Custom permission to only allow admins or managers to add users.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or request.user.role == 'Manager'


class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.role == 'Manager' or request.user.is_superuser)


class IsFrontDesk(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == _FRONT_DESK


class IsTechnician(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'Technician'


class IsAccountant(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'Accountant'


class IsAdminOrManagerOrFrontDesk(permissions.BasePermission):
    """
    Custom permission to allow admins, managers, or front desk to view data.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or request.user.role in ['Manager', _FRONT_DESK]


class IsAdminOrManagerOrFrontDeskOrAccountant(permissions.BasePermission):
    """
    Custom permission to allow admins, managers, front desk, or accountant to view data.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or request.user.role in ['Manager', _FRONT_DESK, 'Accountant']


class IsAdminOrManagerOrAccountant(permissions.BasePermission):
    """
    Custom permission to allow admins, managers, or accountant to view data.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or request.user.role in ['Manager', 'Accountant']
