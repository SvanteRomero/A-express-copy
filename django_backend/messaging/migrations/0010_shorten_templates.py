from django.db import migrations

def shorten_templates(apps, schema_editor):
    MessageTemplate = apps.get_model('messaging', 'MessageTemplate')
    
    templates_data = [
        {
            "name": "Ready for Pickup",
            "content": "Habari {customer}, kifaa {device} (#{taskId}) {status_description}. Tatizo: {description}. Maelezo: {notes} | Gharama: {amount}. {pickup_instruction}. A-Express"
        },
        {
            "name": "Repair in Progress",
            "content": "Habari {customer}, kifaa {device} (#{taskId}) kipo kwa mafundi. Tatizo: {description}. Maelezo: {notes} | Gharama: {amount}. Tutakujulisha kitakapokuwa tayari. A-Express"
        },
        {
            "name": "Remind Debt",
            "content": "Habari {customer}, lipia deni Tsh {outstanding_balance} la kifaa {device} (#{taskId}). Tafadhali lipia haraka. A-Express"
        }
    ]

    for t_data in templates_data:
        MessageTemplate.objects.filter(name=t_data["name"]).update(content=t_data["content"])

class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0009_add_debt_template'),
    ]

    operations = [
        migrations.RunPython(shorten_templates),
    ]
