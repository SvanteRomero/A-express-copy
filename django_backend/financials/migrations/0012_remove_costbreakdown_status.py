from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('financials', '0011_transactionrequest_state_update'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='costbreakdown',
            name='status',
        ),
    ]
