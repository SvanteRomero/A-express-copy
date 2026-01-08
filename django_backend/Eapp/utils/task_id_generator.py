"""
Task ID Generator Utility

Generates unique task IDs in the format: {YearChar}{Month}-{Sequence}
Example: A1-001, A1-002, B3-015

Year character starts at 'A' from the first task ever created,
incrementing by one letter each year.
"""
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
        
        Returns:
            str: Single character representing the year offset
        """
        from Eapp.models import Task
        
        now = timezone.now()
        first_task = Task.objects.order_by('created_at').first()
        
        if first_task:
            first_year = first_task.created_at.year
            year_char = chr(ord('A') + now.year - first_year)
        else:
            year_char = 'A'
        
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
            # Start a new sequence for the month
            new_seq = 1
        
        return new_seq
