from django.db import migrations

def consolidate_templates(apps, schema_editor):
    MessageTemplate = apps.get_model('messaging', 'MessageTemplate')
    
    # Names of templates to delete
    templates_to_delete = [
        "Ready for Pickup (Solved)", 
        "Ready for Pickup (Not Solved)",
        "Ready for Pickup", 
        "In Progress", 
        "Completed", 
        "Diagnostic"
    ]
    
    # Delete old/split templates
    MessageTemplate.objects.filter(name__in=templates_to_delete).delete()

    # Define new consolidated templates
    templates_data = [
        {
            "name": "Ready for Pickup",
            "content": "Habari {customer}, kifaa chako {device} (Kazi #{taskId}) {status_description}. Tatizo: {description}. Maelezo: {notes} | Gharama: {amount}. {pickup_instruction}. Asante kwa kuchagua A-Express."
        },
        {
            "name": "Repair in Progress",
            "content": "Habari {customer}, kifaa chako {device} (Kazi #{taskId}) kimepokelewa na mafundi wetu wameanza kukifanyia kazi. Tatizo: {description}. Maelezo: {notes} | Gharama: {amount}. Tutaujulisha kitakapokuwa tayari. Asante kwa kuvuta subira."
        }
    ]

    for t_data in templates_data:
        MessageTemplate.objects.update_or_create(
            name=t_data["name"],
            defaults={
                "content": t_data["content"],
                "is_active": True
            }
        )

class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0007_update_professional_templates'),
    ]

    operations = [
        migrations.RunPython(consolidate_templates),
    ]
