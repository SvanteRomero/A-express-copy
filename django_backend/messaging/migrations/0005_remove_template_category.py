# Generated manually

from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0004_update_template_style'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='messagetemplate',
            name='category',
        ),
    ]
