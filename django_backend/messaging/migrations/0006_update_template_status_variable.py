# Generated manually

from django.db import migrations

def update_template_status_variable(apps, schema_editor):
    MessageTemplate = apps.get_model('messaging', 'MessageTemplate')
    templates = MessageTemplate.objects.all()
    for template in templates:
        # We need to be careful not to break the format.
        # Current format example: "... | Hali: TAYARI KUCHUKULIWA {notes} | ..."
        # OR "... ||| Hali: TAYARI KUCHUKULIWA {notes} ||| ..." (if previous migration ran)
        
        # We want to replace "Hali: TAYARI KUCHUKULIWA" or "Hali: INAREKEBISHWA" etc with "Hali: {status}"
        
        content = template.content
        
        # Known hardcoded statuses to check for
        replacements = [
            "Hali: TAYARI KUCHUKULIWA",
            "Hali: INAREKEBISHWA",
            "Hali: SUBIRI", # Just in case
        ]
        
        changed = False
        for r in replacements:
            if r in content:
                content = content.replace(r, "Hali: {status}")
                changed = True
        
        if changed:
            template.content = content
            template.save()

def reverse_update(apps, schema_editor):
    # It's hard to reverse perfectly without knowing which status was where, 
    # but we can try to revert to a safe default or do nothing as this is a refinement.
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0005_remove_template_category'),
    ]

    operations = [
        migrations.RunPython(update_template_status_variable, reverse_update),
    ]
