"""
Task ID Generator Utility

Generates unique task IDs in the format: {YearChar}{Month}-{Sequence}
Example: A1-001, A1-002, B3-015

Year character starts at 'A' from the first task ever created,
incrementing by one letter each year.

Configuration:
    TASK_ID_YEAR_OFFSET: Offset the starting year character.
        - 0 (default): Start at 'A'
        - 1: Start at 'B'
        - 2: Start at 'C'
        - etc.
    
    TASK_ID_SEQUENCE_OFFSET: Offset the starting sequence number.
        - 0 (default): Start at 001
        - 50: Start at 051 (for clients already at 050)
        - etc.
        Only applies when no tasks exist for the current month prefix.
"""
import os
from django.utils import timezone


class TaskIDGenerator:
    """Generates unique task IDs for tasks."""
    
    @staticmethod
    def generate():
        """
        Generate a new task ID based on current date and existing tasks.
        
        Returns:
            str: Task ID in format {YearChar}{Month}-{Sequence}
        """
        from Eapp.models import Task
        
        now = timezone.now()
        
        # Determine the year character
        year_char = TaskIDGenerator._get_year_char()
        
        # Format the prefix for the current month
        month_prefix = f"{year_char}{now.month}"
        
        # Get the next sequence number
        sequence = TaskIDGenerator._get_next_sequence(month_prefix)
        
        return f"{month_prefix}-{sequence:03d}"
    
    @staticmethod
    def _get_year_char():
        """
        Calculate the year character based on the first task ever created.
        
        The starting character can be offset via TASK_ID_YEAR_OFFSET env var.
        
        Returns:
            str: Single character representing the year offset
        """
        from Eapp.models import Task
        
        now = timezone.now()
        offset = int(os.environ.get('TASK_ID_YEAR_OFFSET', 0))
        first_task = Task.objects.order_by('created_at').first()
        
        if first_task:
            first_year = first_task.created_at.year
            year_char = chr(ord('A') + offset + now.year - first_year)
        else:
            year_char = chr(ord('A') + offset)
        
        return year_char
    
    @staticmethod
    def _get_next_sequence(month_prefix):
        """
        Get the next sequence number for the given month prefix.
        
        Args:
            month_prefix (str): The month prefix (e.g., 'A1', 'B12')
            
        Returns:
            int: The next sequence number
        """
        from Eapp.models import Task
        
        # Find the last task created this month to determine the next sequence number
        last_task = Task.objects.filter(
            title__startswith=month_prefix
        ).order_by('-title').first()
        
        if last_task:
            # Extract the sequence number from the last task's title
            last_seq = int(last_task.title.split('-')[-1])
            new_seq = last_seq + 1
        else:
            # Start a new sequence for the month, with optional offset
            offset = int(os.environ.get('TASK_ID_SEQUENCE_OFFSET', 0))
            new_seq = offset + 1
        
        return new_seq
