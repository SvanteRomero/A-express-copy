# Generated manually

from django.db import migrations

def update_template_separators(apps, schema_editor):
    MessageTemplate = apps.get_model('messaging', 'MessageTemplate')
    templates = MessageTemplate.objects.all()
    for template in templates:
        # Replace " | " with " ||| "
        # We check if it already has ||| to avoid double replacement if run multiple times (though unlikely in this context)
        if " ||| " not in template.content:
            template.content = template.content.replace(" | ", " ||| ")
            template.save()

def reverse_update(apps, schema_editor):
    MessageTemplate = apps.get_model('messaging', 'MessageTemplate')
    templates = MessageTemplate.objects.all()
    for template in templates:
        template.content = template.content.replace(" ||| ", " | ")
        template.save()

class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0003_seed_templates'),
    ]

    operations = [
        migrations.RunPython(update_template_separators, reverse_update),
    ]
