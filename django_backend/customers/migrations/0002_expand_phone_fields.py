# Generated manually for encryption support
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Expand phone_number and phone fields to accommodate encrypted values.
    
    pgcrypto encrypted values are hex-encoded and can be 100-200+ characters.
    This migration must run BEFORE the encryption migration.
    """

    dependencies = [
        ('customers', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='phonenumber',
            name='phone_number',
            field=models.CharField(max_length=500, unique=True),
        ),
        migrations.AlterField(
            model_name='referrer',
            name='phone',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
    ]
