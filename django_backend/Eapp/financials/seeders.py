import os
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random
from collections import defaultdict

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'your_project_name.settings')
django.setup()

from django.utils import timezone
from django.db.models import Sum
from financials.models import Payment, PaymentMethod, PaymentCategory
from Eapp.models import Task

def seed_payments():
    """
    Seed payments for existing tasks with category_id=1 and method_id from 1 to 4
    Payments are spread throughout 2025 with realistic dates
    """
    print("Starting payments seeding...")
    
    # Get required objects
    try:
        # Get category with ID 1
        category = PaymentCategory.objects.get(id=1)
        print(f"Using category: {category.name}")
    except PaymentCategory.DoesNotExist:
        print("PaymentCategory with id=1 does not exist. Please create it first.")
        return
    
    # Get payment methods with IDs 1 to 4
    payment_methods = list(PaymentMethod.objects.filter(id__in=[1, 2, 3, 4]))
    if not payment_methods:
        print("PaymentMethods with ids 1-4 do not exist. Please create them first.")
        return
    
    print(f"Found {len(payment_methods)} payment methods: {[pm.name for pm in payment_methods]}")
    
    # Get all tasks from 2025
    all_tasks = list(Task.objects.filter(created_at__year=2025))
    print(f"Total 2025 tasks available: {len(all_tasks)}")
    
    if len(all_tasks) == 0:
        print("No 2025 tasks found. Please seed tasks first.")
        return
    
    payments_created = 0
    monthly_payments = defaultdict(int)
    
    # Define monthly payment distribution
    monthly_distribution = {
        1: 0.08,   # January
        2: 0.07,   # February
        3: 0.09,   # March
        4: 0.08,   # April
        5: 0.10,   # May
        6: 0.09,   # June
        7: 0.07,   # July
        8: 0.09,   # August
        9: 0.08,   # September
        10: 0.10,  # October
        11: 0.08,  # November
        12: 0.07,  # December
    }
    
    # Calculate target payments per month based on distribution
    total_target_payments = len(all_tasks) * 2  # Estimate ~2 payments per task
    monthly_targets = {}
    for month, percentage in monthly_distribution.items():
        monthly_targets[month] = max(1, int(total_target_payments * percentage))
    
    print("Monthly payment targets:")
    for month in sorted(monthly_targets.keys()):
        print(f"  Month {month}: {monthly_targets[month]} payments")
    
    # Create a copy of tasks to work with
    available_tasks = all_tasks.copy()
    random.shuffle(available_tasks)
    
    # First, assign each task a payment schedule
    task_schedules = {}
    for task in available_tasks:
        if task.total_cost <= 0 or task.status == 'Pending':
            continue
            
        # Determine how many payments this task will have (1-3)
        num_payments = random.choices([1, 2, 3], weights=[0.3, 0.5, 0.2])[0]
        
        # Determine which months the payments will occur in
        creation_month = task.created_at.month
        
        if num_payments == 1:
            # Single payment in creation month
            payment_months = [creation_month]
        elif num_payments == 2:
            # Two payments: creation month and next month
            payment_months = [creation_month, min(12, creation_month + 1)]
        else:  # 3 payments
            # Three payments: creation month, next month, and month after
            payment_months = [
                creation_month,
                min(12, creation_month + 1),
                min(12, creation_month + 2)
            ]
        
        task_schedules[task.id] = {
            'task': task,
            'payment_months': payment_months,
            'payments_created': 0
        }
    
    # Now create payments month by month
    for current_month in range(1, 13):
        print(f"\nProcessing month {current_month}...")
        
        monthly_created = 0
        target_for_month = monthly_targets[current_month]
        
        # Find tasks that should have payments in this month
        for task_id, schedule in task_schedules.items():
            if monthly_created >= target_for_month:
                break
                
            task = schedule['task']
            payment_months = schedule['payment_months']
            
            # Check if this task should have a payment in current month
            if current_month in payment_months:
                # Check how many payments we've already created for this task
                payments_so_far = schedule['payments_created']
                
                # Check if we should create this payment (based on payment order)
                payment_index = payment_months.index(current_month)
                if payment_index == payments_so_far:  # It's time for this payment
                    try:
                        # Calculate payment amount based on payment number
                        existing_payments_total = task.payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                        
                        if payment_index == 0:  # First payment
                            amount = calculate_first_payment(task.total_cost)
                        elif payment_index == 1:  # Second payment
                            amount = calculate_progress_payment(task.total_cost)
                        else:  # Third payment
                            amount = calculate_final_payment(task.total_cost, existing_payments_total)
                        
                        # Skip if amount is zero or negative
                        if amount <= 0:
                            continue
                        
                        # Random payment method
                        method = random.choice(payment_methods)
                        
                        # Generate payment date within the current month
                        payment_date = generate_monthly_payment_date(current_month, 2025)
                        
                        # Create the payment
                        payment = Payment.objects.create(
                            task=task,
                            amount=amount,
                            date=payment_date,
                            method=method,
                            description=generate_payment_description(task, payment_index + 1, amount),
                            category=category
                        )
                        
                        payments_created += 1
                        monthly_created += 1
                        monthly_payments[current_month] += 1
                        schedule['payments_created'] += 1
                        
                        if payments_created % 20 == 0:
                            print(f"Created {payments_created} payments so far...")
                            
                    except Exception as e:
                        print(f"Error creating payment for task {task.id}: {e}")
                        continue
        
        # If we haven't reached our target for this month, find additional tasks
        if monthly_created < target_for_month:
            remaining_needed = target_for_month - monthly_created
            
            for task in available_tasks:
                if monthly_created >= target_for_month:
                    break
                    
                if task.id not in task_schedules:
                    continue
                    
                schedule = task_schedules[task.id]
                
                # Skip if task already has all its scheduled payments
                if schedule['payments_created'] >= len(schedule['payment_months']):
                    continue
                
                # Only add extra payments if it makes sense chronologically
                if current_month >= task.created_at.month:
                    try:
                        existing_payments_total = task.payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                        amount = calculate_progress_payment(task.total_cost)
                        
                        if amount <= 0 or existing_payments_total + amount > task.total_cost:
                            continue
                        
                        # Random payment method
                        method = random.choice(payment_methods)
                        
                        # Generate payment date within the current month
                        payment_date = generate_monthly_payment_date(current_month, 2025)
                        
                        # Create the payment
                        payment = Payment.objects.create(
                            task=task,
                            amount=amount,
                            date=payment_date,
                            method=method,
                            description=f"Additional progress payment for {task.title}",
                            category=category
                        )
                        
                        payments_created += 1
                        monthly_created += 1
                        monthly_payments[current_month] += 1
                        schedule['payments_created'] += 1
                        
                        if payments_created % 20 == 0:
                            print(f"Created {payments_created} payments so far...")
                            
                    except Exception as e:
                        print(f"Error creating extra payment for task {task.id}: {e}")
                        continue
        
        print(f"Month {current_month}: Created {monthly_created} payments")
    
    print(f"\nPayment distribution summary:")
    for month in sorted(monthly_payments.keys()):
        print(f"  Month {month}: {monthly_payments[month]} payments")
    
    print(f"\nSuccessfully created {payments_created} payments spread throughout 2025!")
    
    # Update task payment statuses based on new payments
    update_task_payment_statuses()

def calculate_first_payment(total_cost):
    """Calculate first payment (deposit)"""
    deposit_percentages = [0.2, 0.3, 0.4, 0.5]  # 20-50% deposit
    percentage = random.choice(deposit_percentages)
    return (total_cost * Decimal(percentage)).quantize(Decimal('1.'))

def calculate_progress_payment(total_cost):
    """Calculate progress payment"""
    progress_percentages = [0.2, 0.3, 0.4]  # 20-40% progress payment
    percentage = random.choice(progress_percentages)
    return (total_cost * Decimal(percentage)).quantize(Decimal('1.'))

def calculate_final_payment(total_cost, existing_payments):
    """Calculate final payment (remaining balance)"""
    remaining = total_cost - existing_payments
    return max(remaining, Decimal('0')).quantize(Decimal('1.'))

def generate_monthly_payment_date(month, year):
    """Generate payment date within a specific month"""
    # Define business days (avoid weekends for more realism)
    if month in [1, 3, 5, 7, 8, 10, 12]:  # 31-day months
        day = random.randint(1, 31)
    elif month == 2:  # February
        day = random.randint(1, 28)  # 2025 is not a leap year
    else:  # 30-day months
        day = random.randint(1, 30)
    
    return datetime(year, month, day).date()

def generate_payment_description(task, payment_number, amount):
    """Generate descriptive payment messages"""
    if payment_number == 1:
        return f"Initial deposit for {task.title}"
    elif payment_number == 2:
        return f"Progress payment for {task.title}"
    else:
        return f"Final payment for {task.title} - Balance settlement"

def update_task_payment_statuses():
    """
    Update task payment statuses based on the payments made
    """
    print("Updating task payment statuses...")
    
    from Eapp.models import Task
    
    tasks_updated = 0
    for task in Task.objects.all():
        total_payments = task.payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Update paid_amount
        task.paid_amount = total_payments
        
        # Update payment status
        if total_payments == 0:
            task.payment_status = 'Unpaid'
        elif total_payments < task.total_cost:
            task.payment_status = 'Partially Paid'
        elif total_payments >= task.total_cost:
            task.payment_status = 'Fully Paid'
            if not task.paid_date:
                # Use the date of the last payment as paid_date
                last_payment = task.payments.order_by('-date').first()
                if last_payment:
                    task.paid_date = last_payment.date
        
        task.save()
        tasks_updated += 1
    
    print(f"Updated payment statuses for {tasks_updated} tasks")

def clear_payments():
    """Clear all payments"""
    print("Clearing all payments...")
    Payment.objects.all().delete()
    print("All payments cleared!")

if __name__ == '__main__':
    # Uncomment the line below to clear existing payments
    # clear_payments()
    
    seed_payments()