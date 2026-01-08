
from Eapp.models import User, Task

ALLOWED_TRANSITIONS = {
    'Front Desk': {
        'Completed': ['Ready for Pickup', 'In Progress', 'Pending'],
        'Ready for Pickup': ['Picked Up', 'Pending', 'In Progress'],
        'Picked Up': ['In Progress'],
        'Pending': ['Terminated'],
        'In Progress': ['Terminated', 'Pending'],
    },
    'Technician': {
        'Pending': ['In Progress'],
        'In Progress': ['Awaiting Parts', 'Completed'],
        'Awaiting Parts': ['In Progress'],
    },
    'Manager': {
        # Managers can transition from any status to any other status.
    }
}

def can_transition(user: User, task: Task, new_status: str) -> bool:
    """
    Check if a user has permission to transition a task to a new status.
    """
    if user.is_superuser or user.role == User.Role.MANAGER:
        return True

    role_transitions = ALLOWED_TRANSITIONS.get(user.role, {})
    current_status = task.status
    
    allowed_next_statuses = role_transitions.get(current_status, [])
    return new_status in allowed_next_statuses
