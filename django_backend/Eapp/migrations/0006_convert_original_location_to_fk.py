# Custom migration to convert location CharField to ForeignKey
# This handles a partially migrated state where current_location is already a FK

from django.db import migrations, models
import django.db.models.deletion


def migrate_original_location_to_fk(apps, schema_editor):
    """
    Convert original_location_snapshot text field to foreign key reference.
    Creates Location objects for any location names that don't exist yet.
    """
    Task = apps.get_model('Eapp', 'Task')
    Location = apps.get_model('common', 'Location')
    
    # Get all unique location names from original_location_snapshot
    original_locations = Task.objects.exclude(
        original_location_snapshot_temp=''
    ).exclude(
        original_location_snapshot_temp__isnull=True
    ).values_list('original_location_snapshot_temp', flat=True).distinct()
    
    # Create Location objects for any names that don't exist
    for loc_name in original_locations:
        if loc_name and loc_name.strip():
            Location.objects.get_or_create(name=loc_name.strip())
    
    # Migrate original_location_snapshot
    for task in Task.objects.all():
        if task.original_location_snapshot_temp:
            try:
                location = Location.objects.get(name=task.original_location_snapshot_temp.strip())
                task.original_location_snapshot_fk = location
                task.save(update_fields=['original_location_snapshot_fk'])
            except Location.DoesNotExist:
                # This shouldn't happen after the above, but just in case
                location = Location.objects.create(name=task.original_location_snapshot_temp.strip())
                task.original_location_snapshot_fk = location
                task.save(update_fields=['original_location_snapshot_fk'])


class Migration(migrations.Migration):

    dependencies = [
        ('Eapp', '0005_convert_current_location'),
        ('common', '0004_add_location_is_active'),
    ]

    operations = [
        # NOTE: current_location is already a FK (current_location_id) from previous partial migration
        # We only need to handle original_location_snapshot
        
        # Step 1: Rename original_location_snapshot to temporary name
        migrations.RenameField(
            model_name='task',
            old_name='original_location_snapshot',
            new_name='original_location_snapshot_temp',
        ),
        
        # Step 2: Add new FK field for original_location_snapshot (nullable)
        migrations.AddField(
            model_name='task',
            name='original_location_snapshot_fk',
            field=models.ForeignKey(
                blank=True,
                null=True,
                help_text='Snapshot of original location before workshop',
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='original_tasks',
                to='common.location'
            ),
        ),
        
        # Step 3: Migrate data from text to FK
        migrations.RunPython(migrate_original_location_to_fk, migrations.RunPython.noop),
        
        # Step 4: Remove old text field
        migrations.RemoveField(
            model_name='task',
            name='original_location_snapshot_temp',
        ),
        
        # Step 5: Rename FK field to final name
        migrations.RenameField(
            model_name='task',
            old_name='original_location_snapshot_fk',
            new_name='original_location_snapshot',
        ),
    ]
