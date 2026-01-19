from django.db import migrations

def wipe_templates(apps, schema_editor):
    # Get the model dynamically to ensure compatibility with migration state
    MessageTemplate = apps.get_model('messaging', 'MessageTemplate')
    # Delete all existing templates
    MessageTemplate.objects.all().delete()

class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0010_shorten_templates'),
    ]

    operations = [
        migrations.RunPython(wipe_templates),
    ]
