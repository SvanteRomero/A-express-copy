from django.db import migrations

def update_templates(apps, schema_editor):
    MessageTemplate = apps.get_model('messaging', 'MessageTemplate')
    
    templates_data = [
        {
            "name": "Ready for Pickup (Solved)",
            "content": "Habari {customer}, kifaa chako {device} (Kazi #{taskId}) kimefanikiwa kurekebishwa na kiko tayari kuchukuliwa. Tatizo: {description}. Maelezo: {notes}. Gharama: {amount}. Tafadhali fika dukani wakati wa saa za kazi uchukue kifaa chako. Asante kwa kuchagua A-Express."
        },
        {
            "name": "Ready for Pickup (Not Solved)",
            "content": "Habari {customer}, kifaa chako {device} (Kazi #{taskId}) kiko tayari kuchukuliwa. Kwa bahati mbaya, hatukuweza kutatua tatizo hilo. Tatizo: {description}. Maelezo: {notes}. Gharama: {amount}. Tafadhali fika dukani uchukue kifaa chako. Asante kwa kuchagua A-Express."
        },
        {
            "name": "Repair in Progress",
            "content": "Habari {customer}, kifaa chako {device} (Kazi #{taskId}) kimepokelewa na mafundi wetu wameanza kukifanyia kazi. Tatizo: {description}. Maelezo: {notes}. Gharama: {amount}. Tutaujulisha kitakapokuwa tayari. Asante kwa kuvuta subira."
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
        ('messaging', '0006_update_template_status_variable'),
    ]

    operations = [
        migrations.RunPython(update_templates),
    ]
