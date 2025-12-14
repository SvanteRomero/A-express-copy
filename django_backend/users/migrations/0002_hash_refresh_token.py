# Generated manually for security fix C-04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        # Remove the old refresh_token field
        migrations.RemoveField(
            model_name='session',
            name='refresh_token',
        ),
        # Add the new refresh_token_hash field
        migrations.AddField(
            model_name='session',
            name='refresh_token_hash',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
    ]
