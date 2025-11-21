import os
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'A_express.settings')
django.setup()

from django.utils import timezone
from Eapp.models import Task, TaskActivity
from customers.models import Customer, Referrer
from users.models import User
from common.models import Brand, Location

def generate_unique_task_id(target_date, existing_ids):
    """
    Generate a unique task ID for a specific date
    """
    # Determine the year character (assuming first year is 2023)
    first_year = 2023
    year_char = chr(ord('A') + target_date.year - first_year)
    
    # Format the prefix for the target month
    month_prefix = f"{year_char}{target_date.month:02d}"
    
    # Find the highest sequence number for this month prefix
    max_seq = 0
    for task_id in existing_ids:
        if task_id.startswith(month_prefix):
            try:
                seq_part = task_id.split('-')[1]
                seq_num = int(seq_part)
                if seq_num > max_seq:
                    max_seq = seq_num
            except (ValueError, IndexError):
                continue
    
    # Use the next sequence number
    new_seq = max_seq + 1
    return f"{month_prefix}-{new_seq:03d}"

def create_task_activities(task, user, created_date):
    """
    Create realistic activity logs for a task based on its status and timeline
    """
    activities_data = []
    current_time = created_date
    
    # Initial intake activity (always created)
    activities_data.append({
        'task': task,
        'user': user,
        'timestamp': current_time,
        'type': TaskActivity.ActivityType.INTAKE,
        'message': f"Task created and assigned to {task.assigned_to.get_full_name() if task.assigned_to.get_full_name() else task.assigned_to.username}."
    })
    
    # Add device notes activity if exists
    if task.device_notes:
        current_time += timedelta(minutes=10)
        activities_data.append({
            'task': task,
            'user': user,
            'timestamp': current_time,
            'type': TaskActivity.ActivityType.DEVICE_NOTE,
            'message': f"Device notes added: {task.device_notes}"
        })
    
    # Status-specific activities
    if task.status == 'In Progress':
        current_time += timedelta(hours=2)
        activities_data.append({
            'task': task,
            'user': task.assigned_to,
            'timestamp': current_time,
            'type': TaskActivity.ActivityType.DIAGNOSIS,
            'message': f"Initial diagnosis started by {task.assigned_to.get_full_name() if task.assigned_to.get_full_name() else task.assigned_to.username}."
        })
        
        # Add some progress notes
        progress_messages = [
            "Diagnostic tests completed, identifying root cause.",
            "Parts ordered for repair, awaiting delivery.",
            "Software troubleshooting in progress.",
            "Hardware components tested and verified.",
            "Repair procedure started, components being replaced."
        ]
        
        for i, message in enumerate(random.sample(progress_messages, min(2, len(progress_messages)))):
            current_time += timedelta(hours=random.randint(4, 24))
            activities_data.append({
                'task': task,
                'user': task.assigned_to,
                'timestamp': current_time,
                'type': TaskActivity.ActivityType.NOTE,
                'message': message
            })
    
    elif task.status == 'Completed':
        # Add progress activities leading to completion
        current_time += timedelta(hours=4)
        activities_data.append({
            'task': task,
            'user': task.assigned_to,
            'timestamp': current_time,
            'type': TaskActivity.ActivityType.DIAGNOSIS,
            'message': "Comprehensive diagnostic completed, repair plan established."
        })
        
        current_time += timedelta(hours=8)
        activities_data.append({
            'task': task,
            'user': task.assigned_to,
            'timestamp': current_time,
            'type': TaskActivity.ActivityType.NOTE,
            'message': "All repairs completed, running final tests and quality checks."
        })
        
        current_time += timedelta(hours=2)
        activities_data.append({
            'task': task,
            'user': task.assigned_to,
            'timestamp': current_time,
            'type': TaskActivity.ActivityType.STATUS_UPDATE,
            'message': "Task marked as completed, ready for customer notification."
        })
    
    elif task.status == 'Ready for Pickup':
        # Activities leading to ready status
        current_time += timedelta(hours=6)
        activities_data.append({
            'task': task,
            'user': task.assigned_to,
            'timestamp': current_time,
            'type': TaskActivity.ActivityType.NOTE,
            'message': "Repair completed successfully, device fully functional."
        })
        
        current_time += timedelta(hours=1)
        activities_data.append({
            'task': task,
            'user': user,  # Manager or front desk
            'timestamp': current_time,
            'type': TaskActivity.ActivityType.READY,
            'message': "Device approved and marked ready for customer pickup."
        })
    
    elif task.status == 'Picked Up':
        # Complete workflow including pickup
        current_time += timedelta(hours=8)
        activities_data.append({
            'task': task,
            'user': task.assigned_to,
            'timestamp': current_time,
            'type': TaskActivity.ActivityType.NOTE,
            'message': "Repair completed, device tested and ready for customer."
        })
        
        current_time += timedelta(hours=2)
        activities_data.append({
            'task': task,
            'user': user,
            'timestamp': current_time,
            'type': TaskActivity.ActivityType.READY,
            'message': "Device marked as ready for pickup, customer notified."
        })
        
        current_time += timedelta(hours=random.randint(24, 72))  # 1-3 days later
        activities_data.append({
            'task': task,
            'user': user,
            'timestamp': current_time,
            'type': TaskActivity.ActivityType.PICKED_UP,
            'message': f"Device picked up by customer {task.customer.name}. Payment status: {task.payment_status}."
        })
    
    # Add customer contact activities for some tasks
    if random.random() > 0.5:  # 50% chance
        current_time += timedelta(hours=random.randint(1, 12))
        contact_types = ["phone call", "email", "SMS notification"]
        activities_data.append({
            'task': task,
            'user': user,
            'timestamp': current_time,
            'type': TaskActivity.ActivityType.CUSTOMER_CONTACT,
            'message': f"Customer contacted via {random.choice(contact_types)} with status update."
        })
    
    # Create all activities and return the count
    activity_count = 0
    for activity_data in activities_data:
        TaskActivity.objects.create(**activity_data)
        activity_count += 1
    
    return activity_count

def seed_tasks():
    """
    Main seeder function to create tasks across different months and years
    """
    print("Starting task seeding...")
    
    # Get required related objects
    try:
        customers = list(Customer.objects.all())
        if not customers:
            print("No customers found. Please seed customers first.")
            return
        
        # Get only technicians for assignment
        technicians = list(User.objects.filter(role='Technician'))
        if not technicians:
            print("No technicians found. Please create some technician users first.")
            return
        
        # Get other users for created_by field (can be any role)
        other_users = list(User.objects.exclude(role='Technician'))
        if not other_users:
            other_users = technicians  # Fallback to technicians if no other users
        
        brands = list(Brand.objects.all())
        locations = list(Location.objects.all())
        referrers = list(Referrer.objects.all())
        
        if not brands:
            print("No brands found. Please seed brands first.")
            return
        
    except Exception as e:
        print(f"Error fetching related objects: {e}")
        return

    # Get all existing task IDs to avoid duplicates
    existing_task_ids = set(Task.objects.values_list('title', flat=True))
    
    # Define date ranges - ONLY 2025 from January to December
    date_ranges = [
        (datetime(2025, 1, 1), datetime(2025, 1, 31), 15),   # Jan 2025 - 15 tasks
        (datetime(2025, 2, 1), datetime(2025, 2, 28), 12),   # Feb 2025 - 12 tasks
        (datetime(2025, 3, 1), datetime(2025, 3, 31), 18),   # Mar 2025 - 18 tasks
        (datetime(2025, 4, 1), datetime(2025, 4, 30), 16),   # Apr 2025 - 16 tasks
        (datetime(2025, 5, 1), datetime(2025, 5, 31), 20),   # May 2025 - 20 tasks
        (datetime(2025, 6, 1), datetime(2025, 6, 30), 14),   # Jun 2025 - 14 tasks
        (datetime(2025, 7, 1), datetime(2025, 7, 31), 17),   # Jul 2025 - 17 tasks
        (datetime(2025, 8, 1), datetime(2025, 8, 31), 19),   # Aug 2025 - 19 tasks
        (datetime(2025, 9, 1), datetime(2025, 9, 30), 15),   # Sep 2025 - 15 tasks
        (datetime(2025, 10, 1), datetime(2025, 10, 31), 16), # Oct 2025 - 16 tasks
        (datetime(2025, 11, 1), datetime(2025, 11, 30), 13), # Nov 2025 - 13 tasks
        (datetime(2025, 12, 1), datetime(2025, 12, 31), 10), # Dec 2025 - 10 tasks
    ]

    # Detailed placeholder descriptions
    device_problems = [
        "Laptop screen cracked and needs replacement. Customer reported accidental drop damage.",
        "Battery not holding charge - drains within 30 minutes of use. Requires battery replacement.",
        "Motherboard power issue - device won't turn on. Suspected power circuit failure.",
        "Keyboard malfunction - several keys not responding. Needs keyboard replacement.",
        "Windows OS installation required - system corrupted after failed update.",
        "Virus and malware removal - system running slow with popup advertisements.",
        "Data recovery from crashed hard drive - customer needs important documents recovered.",
        "Water damage repair - laptop exposed to liquid spill. Requires thorough cleaning and component testing.",
        "Power adapter port loose - charging intermittent. Needs DC jack replacement.",
        "System performance optimization - slow boot times and application loading.",
        "WiFi connectivity issues - frequent disconnections and slow network speeds.",
        "Blue screen errors - system crashes randomly with various error codes.",
        "Fan making loud grinding noise - likely bearing failure requiring fan replacement.",
        "Touchpad not responsive - cursor movement erratic or non-functional.",
        "Display backlight failure - screen dim or completely dark but system powers on.",
        "Audio jack not working - no sound output through headphones or speakers.",
        "Webcam malfunction - camera not detected by system applications.",
        "USB ports not functioning - devices not recognized when connected.",
        "Overheating issues - system shuts down during heavy usage due to thermal protection.",
        "BIOS configuration required - system settings corrupted or needs update."
    ]
    
    laptop_models = [
        "Dell XPS 13 9310", "MacBook Pro 14-inch M2", "ThinkPad T14 Gen 2", 
        "HP Spectre x360 14", "Asus ZenBook Flip 13", "Acer Swift 3 SF314", 
        "Lenovo Yoga 9i 14", "MSI Prestige 14 Evo", "Surface Laptop 4 15-inch", 
        "Razer Blade 15 Advanced", "MacBook Air M1", "Dell Latitude 5420",
        "HP Pavilion 15", "Lenovo IdeaPad 5", "Acer Aspire 5", "Asus VivoBook 15",
        "Microsoft Surface Pro 8", "Samsung Galaxy Book2 Pro", "LG Gram 17",
        "Framework Laptop 13"
    ]
    
    device_notes_samples = [
        "Customer reported intermittent screen flickering before complete failure.",
        "Device won't turn on after coffee spill incident. Immediate attention required.",
        "Slow performance and frequent crashes when running multiple applications.",
        "Keyboard keys sticking, likely due to debris accumulation under keycaps.",
        "Battery drains quickly, lasts only 1 hour on full charge - original battery.",
        "WiFi connectivity issues in all networks, both 2.4GHz and 5GHz bands affected.",
        "Blue screen errors occurring randomly during normal usage patterns.",
        "Fan making loud grinding noise increasing with system temperature.",
        "Touchpad not responsive after recent system update was installed.",
        "Charging port loose, requires careful positioning for charging to initiate.",
        "Display shows horizontal lines and artifacts during graphics-intensive tasks.",
        "No audio output from built-in speakers or headphone jack.",
        "Webcam shows black screen in all video conferencing applications.",
        "USB-C port not charging device or recognizing peripheral connections.",
        "System overheats during video playback and basic web browsing.",
        "BIOS time resetting on each startup, indicating CMOS battery failure.",
        "Trackpoint not functioning on ThinkPad model, driver reinstall attempted.",
        "Thunderbolt port not detecting external displays or storage devices.",
        "Microphone array not picking up audio during calls and recordings.",
        "Sleep/wake functionality not working properly, system hangs on resume."
    ]

    # Whole number costs for tasks (in dollars)
    cost_ranges = [50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 350, 400, 450, 500]

    tasks_created = 0
    activities_created = 0
    
    for start_date, end_date, num_tasks in date_ranges:
        print(f"Creating {num_tasks} tasks for {start_date.strftime('%B %Y')}...")
        
        for i in range(num_tasks):
            try:
                # Generate random date within the range
                random_days = random.randint(0, (end_date - start_date).days)
                random_hours = random.randint(8, 17)  # Business hours
                random_minutes = random.randint(0, 59)
                
                created_date = start_date + timedelta(
                    days=random_days, 
                    hours=random_hours, 
                    minutes=random_minutes
                )
                
                # Make timezone aware
                created_date = timezone.make_aware(created_date)
                
                # Generate unique task ID for this date
                task_id = generate_unique_task_id(created_date, existing_task_ids)
                existing_task_ids.add(task_id)  # Add to set to prevent duplicates
                
                # Random data for task
                customer = random.choice(customers)
                created_by = random.choice(other_users)  # Non-technician user creates the task
                assigned_to = random.choice(technicians)  # Always assign to a technician
                brand = random.choice(brands)
                location = random.choice(locations) if locations else None
                referrer = random.choice(referrers) if referrers and random.random() > 0.7 else None
                
                # Status distribution - most tasks should be assigned and in progress
                status_weights = [0.05, 0.6, 0.1, 0.1, 0.1, 0.04, 0.01]  # More In Progress
                status = random.choices(
                    [status[0] for status in Task.Status.choices],
                    weights=status_weights
                )[0]
                
                # Payment status based on task status
                if status in ['Picked Up', 'Completed']:
                    payment_weights = [0.1, 0.3, 0.6]  # More likely to be paid
                    payment_status = random.choices(
                        [ps[0] for ps in Task.PaymentStatus.choices if ps[0] != 'Refunded'],
                        weights=payment_weights
                    )[0]
                else:
                    payment_weights = [0.6, 0.3, 0.1]  # More likely to be unpaid
                    payment_status = random.choices(
                        [ps[0] for ps in Task.PaymentStatus.choices if ps[0] != 'Refunded'],
                        weights=payment_weights
                    )[0]
                
                # Calculate costs and payments - using whole numbers only
                total_cost = Decimal(random.choice(cost_ranges))
                
                # Calculate paid amount based on payment status
                if payment_status == 'Fully Paid':
                    paid_amount = total_cost
                elif payment_status == 'Partially Paid':
                    # Choose a whole number partial payment (25%, 50%, or 75% of total cost)
                    partial_percentage = random.choice([25, 50, 75])
                    paid_amount = (total_cost * Decimal(partial_percentage) / Decimal(100)).quantize(Decimal('1.'))
                else:  # Unpaid
                    paid_amount = Decimal('0')
                
                # Create the task
                task = Task.objects.create(
                    title=task_id,
                    description=random.choice(device_problems),
                    status=status,
                    assigned_to=assigned_to,  # Always assigned to technician
                    created_by=created_by,
                    created_at=created_date,
                    updated_at=created_date,
                    due_date=created_date + timedelta(days=random.randint(3, 10)),
                    customer=customer,
                    brand=brand,
                    device_type=random.choice([dt[0] for dt in Task.DeviceType.choices]),
                    device_notes=random.choice(device_notes_samples),
                    laptop_model=random.choice(laptop_models),
                    estimated_cost=total_cost,
                    total_cost=total_cost,
                    paid_amount=paid_amount,
                    payment_status=payment_status,
                    current_location=location.name if location else "Main Workshop",
                    urgency=random.choice([u[0] for u in Task.Urgency.choices]),
                    date_in=created_date.date(),
                    is_debt=payment_status != 'Fully Paid' and status == 'Picked Up',
                    is_referred=referrer is not None,
                    referred_by=referrer,
                    workshop_status=random.choice([ws[0] for ws in Task.WorkshopStatus.choices]) if random.random() > 0.7 else None,
                    workshop_location=location if random.random() > 0.7 else None,
                )
                
                # Create activities for this task
                activity_count = create_task_activities(task, created_by, created_date)
                activities_created += activity_count
                
                tasks_created += 1
                
                if tasks_created % 10 == 0:
                    print(f"Created {tasks_created} tasks and {activities_created} activities so far...")
                    
            except Exception as e:
                print(f"Error creating task {i+1} for {start_date.strftime('%B %Y')}: {e}")
                continue
    
    print(f"Successfully created {tasks_created} tasks with {activities_created} activities across 2025!")

def calculate_partial_payment(total_cost):
    """
    Calculate a partial payment amount using whole numbers only
    """
    # Choose a whole number partial payment (25%, 50%, or 75% of total cost)
    partial_percentage = random.choice([25, 50, 75])
    return (total_cost * Decimal(partial_percentage) / Decimal(100)).quantize(Decimal('1.'))

def clear_tasks():
    """Clear all tasks and activities"""
    print("Clearing all tasks and activities...")
    TaskActivity.objects.all().delete()
    Task.objects.all().delete()
    print("All tasks and activities cleared!")

if __name__ == '__main__':
    # Uncomment the line below to clear existing data
    # clear_tasks()
    
    seed_tasks()