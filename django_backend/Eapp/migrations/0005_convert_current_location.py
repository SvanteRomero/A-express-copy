# Custom migration to convert current_location CharField to ForeignKey

from django.db import migrations, models, connection
import django.db.models.deletion


def check_column_exists(table_name, column_name):
    """Check if a column exists in the database."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name=%s AND column_name=%s
        """, [table_name, column_name])
        return cursor.fetchone() is not None


def migrate_current_location_to_fk(apps, schema_editor):
    """
    Convert current_location text field to foreign key reference.
    Creates Location objects for any location names that don't exist yet.
    Handles partial migration states gracefully.
    """
    Task = apps.get_model('Eapp', 'Task')
    Location = apps.get_model('common', 'Location')
    
    # Check which field exists (current_location or current_location_temp)
    has_temp = check_column_exists('Eapp_task', 'current_location_temp')
    has_original = check_column_exists('Eapp_task', 'current_location')
    
    # Determine which field to read from
    source_field = 'current_location_temp' if has_temp else 'current_location'
    
    # Only proceed if we have a source field to migrate from
    if not (has_temp or has_original):
        return  # Nothing to migrate
    
    # Use values() to only fetch the fields we need and avoid migration state conflicts
    # Get all unique location names from the source field
    current_locations = Task.objects.exclude(
        **{source_field: ''}
    ).exclude(
        **{f'{source_field}__isnull': True}
    ).values_list(source_field, flat=True).distinct()
    
    # Create Location objects for any names that don't exist
    for loc_name in current_locations:
        if loc_name and loc_name.strip():
            Location.objects.get_or_create(name=loc_name.strip())
    
    # Migrate current_location using values() and update() to avoid loading all fields
    # This prevents conflicts with fields that may have different states in the database
    tasks_to_update = Task.objects.exclude(
        **{source_field: ''}
    ).exclude(
        **{f'{source_field}__isnull': True}
    ).values('id', source_field)
    
    for task_data in tasks_to_update:
        loc_name = task_data[source_field]
        if loc_name and loc_name.strip():
            try:
                location = Location.objects.get(name=loc_name.strip())
                Task.objects.filter(id=task_data['id']).update(current_location_fk=location)
            except Location.DoesNotExist:
                # This shouldn't happen after the above, but just in case
                location = Location.objects.create(name=loc_name.strip())
                Task.objects.filter(id=task_data['id']).update(current_location_fk=location)


class Migration(migrations.Migration):

    dependencies = [
        ('Eapp', '0004_remove_task_workshop_technician'),
        ('common', '0004_add_location_is_active'),
    ]

    operations = [
        # Step 1: Rename current_location to temporary name
        migrations.RenameField(
            model_name='task',
            old_name='current_location',
            new_name='current_location_temp',
        ),
        
        # Step 2: Add new FK field for current_location (nullable temporarily)
        migrations.AddField(
            model_name='task',
            name='current_location_fk',
            field=models.ForeignKey(
                blank=True,
                null=True,
                help_text='Current location of the task',
                on_delete=django.db.models.deletion.PROTECT,
                related_name='current_tasks',
                to='common.location'
            ),
        ),
        
        # Step 3: Migrate data from text to FK
        # This function checks the actual database state to handle partial migrations
        migrations.RunPython(migrate_current_location_to_fk, migrations.RunPython.noop),
        
        # Step 4: Make FK non-nullable (all tasks must have a location)
        migrations.AlterField(
            model_name='task',
            name='current_location_fk',
            field=models.ForeignKey(
                help_text='Current location of the task',
                on_delete=django.db.models.deletion.PROTECT,
                related_name='current_tasks',
                to='common.location'
            ),
        ),
        
        # Step 5: Remove old text field
        migrations.RemoveField(
            model_name='task',
            name='current_location_temp',
        ),
        
        # Step 6: Rename FK field to final name
        migrations.RenameField(
            model_name='task',
            old_name='current_location_fk',
            new_name='current_location',
        ),
    ]
