from django.db import migrations

def add_debt_template(apps, schema_editor):
    MessageTemplate = apps.get_model('messaging', 'MessageTemplate')
    
    MessageTemplate.objects.create(
        name="Remind Debt",
        content="Habari {customer}, tunakukumbusha kulipia deni la Tsh {outstanding_balance} kwa ajili ya kifaa chako {device} (Kazi #{taskId}). Tafadhali lipia haraka iwezekanavyo. Asante.",
        is_active=True
    )

class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0008_consolidate_templates'),
    ]

    operations = [
        migrations.RunPython(add_debt_template),
    ]
