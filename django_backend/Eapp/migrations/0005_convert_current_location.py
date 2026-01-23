# Custom migration to convert current_location CharField to ForeignKey

from django.db import migrations, models
import django.db.models.deletion


def migrate_current_location_to_fk(apps, schema_editor):
    """
    Convert current_location text field to foreign key reference.
    Creates Location objects for any location names that don't exist yet.
    """
    Task = apps.get_model('Eapp', 'Task')
    Location = apps.get_model('common', 'Location')
    
    # Get all unique location names from current_location
    current_locations = Task.objects.exclude(
        current_location_temp=''
    ).exclude(
        current_location_temp__isnull=True
    ).values_list('current_location_temp', flat=True).distinct()
    
    # Create Location objects for any names that don't exist
    for loc_name in current_locations:
        if loc_name and loc_name.strip():
            Location.objects.get_or_create(name=loc_name.strip())
    
    # Migrate current_location for all tasks
    for task in Task.objects.all():
        if task.current_location_temp:
            try:
                location = Location.objects.get(name=task.current_location_temp.strip())
                task.current_location_fk = location
                task.save(update_fields=['current_location_fk'])
            except Location.DoesNotExist:
                # This shouldn't happen after the above, but just in case
                location = Location.objects.create(name=task.current_location_temp.strip())
                task.current_location_fk = location
                task.save(update_fields=['current_location_fk'])


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
