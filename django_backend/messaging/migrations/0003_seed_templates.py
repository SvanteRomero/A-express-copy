from django.db import migrations

def seed_templates(apps, schema_editor):
    MessageTemplate = apps.get_model('messaging', 'MessageTemplate')
    
    templates = [
        {
            "name": "Ready for Pickup (Swahili)",
            "category": "pickup",
            "content": "Habari {customer} ||| Kazi: {taskId} ||| Kifaa: {device} ||| Tatizo: {description} ||| Gharama: {amount} ||| Hali: {status} {notes} ||| Kwa maelezo zaidi piga: 0745869216 - A-Express"
        },
        {
            "name": "Repair In Progress (Swahili)",
            "category": "progress",
            "content": "Habari {customer} ||| Kazi: {taskId} ||| Kifaa: {device} ||| Tatizo: {description} ||| Gharama: {amount} ||| Hali: {status} {notes} ||| Kwa maelezo zaidi piga: 0745869216 - A-Express"
        },
    ]
    
    for tmpl in templates:
        MessageTemplate.objects.create(
            name=tmpl['name'],
            category=tmpl['category'],
            content=tmpl['content']
        )

def remove_templates(apps, schema_editor):
    MessageTemplate = apps.get_model('messaging', 'MessageTemplate')
    MessageTemplate.objects.filter(name__in=[
        "Ready for Pickup (Swahili)", 
        "Repair In Progress (Swahili)",
    ]).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0002_messagetemplate'),
    ]

    operations = [
        migrations.RunPython(seed_templates, remove_templates),
    ]
