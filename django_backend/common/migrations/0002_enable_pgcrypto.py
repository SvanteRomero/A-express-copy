"""
Migration to enable pgcrypto extension for field-level encryption.

This migration only runs on PostgreSQL databases.
On MySQL/SQLite, it will be skipped gracefully.
"""
from django.db import migrations, connection


def enable_pgcrypto(apps, schema_editor):
    """Enable pgcrypto extension on PostgreSQL only."""
    if connection.vendor == 'postgresql':
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")


def disable_pgcrypto(apps, schema_editor):
    """Disable pgcrypto extension on PostgreSQL only."""
    if connection.vendor == 'postgresql':
        with connection.cursor() as cursor:
            cursor.execute("DROP EXTENSION IF EXISTS pgcrypto;")


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(enable_pgcrypto, disable_pgcrypto),
    ]
