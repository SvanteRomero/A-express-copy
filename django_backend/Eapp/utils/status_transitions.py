
from Eapp.models import User, Task

_IN_PROGRESS = 'In Progress'
_AWAITING_PARTS = 'Awaiting Parts'
_PENDING = 'Pending'
_COMPLETED = 'Completed'
_READY_FOR_PICKUP = 'Ready for Pickup'
_PICKED_UP = 'Picked Up'
_TERMINATED = 'Terminated'

ALLOWED_TRANSITIONS = {
    'Front Desk': {
        _COMPLETED: [_READY_FOR_PICKUP, _IN_PROGRESS, _PENDING],
        _READY_FOR_PICKUP: [_PICKED_UP, _PENDING, _IN_PROGRESS],
        _PICKED_UP: [_IN_PROGRESS],
        _PENDING: [_TERMINATED, _IN_PROGRESS],
        _IN_PROGRESS: [_TERMINATED, _PENDING, _IN_PROGRESS],
        _AWAITING_PARTS: [_IN_PROGRESS],
    },
    'Technician': {
        _PENDING: [_IN_PROGRESS],
        _IN_PROGRESS: [_AWAITING_PARTS, _COMPLETED],
        _AWAITING_PARTS: [_IN_PROGRESS],
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
