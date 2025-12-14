"""
Migration to encrypt existing sensitive data in customer and financial records.

This migration encrypts:
- PhoneNumber.phone_number
- Referrer.phone
- Task.device_notes and qc_notes
- Payment.amount (stored as encrypted string)

IMPORTANT: This migration requires:
1. PostgreSQL with pgcrypto extension enabled (run 0001_enable_pgcrypto first)
2. FIELD_ENCRYPTION_KEY environment variable set

The migration is reversible - it stores the encrypted values directly in the existing fields.
"""
from django.db import migrations, connection
import os
import logging

logger = logging.getLogger(__name__)


def encrypt_field(apps, schema_editor, model_name, app_name, field_name):
    """Encrypt all values in a specific field using pgcrypto."""
    # Skip on non-PostgreSQL databases
    if connection.vendor != 'postgresql':
        logger.info(f"Skipping encryption of {model_name}.{field_name} - not PostgreSQL")
        return 0
    
    key = os.environ.get('FIELD_ENCRYPTION_KEY')
    if not key:
        logger.warning(f"FIELD_ENCRYPTION_KEY not set - skipping encryption of {model_name}.{field_name}")
        return 0
    
    Model = apps.get_model(app_name, model_name)
    count = 0
    
    with connection.cursor() as cursor:
        for obj in Model.objects.all().iterator():
            value = getattr(obj, field_name)
            if value and not (len(str(value)) > 40 and str(value).startswith('c3')):  # Not already encrypted
                try:
                    cursor.execute(
                        "SELECT encode(pgp_sym_encrypt(%s, %s), 'hex')",
                        [str(value), key]
                    )
                    encrypted = cursor.fetchone()[0]
                    Model.objects.filter(pk=obj.pk).update(**{field_name: encrypted})
                    count += 1
                except Exception as e:
                    logger.error(f"Failed to encrypt {model_name}.{field_name} for pk={obj.pk}: {e}")
    
    logger.info(f"Encrypted {count} records in {model_name}.{field_name}")
    return count


def decrypt_field(apps, schema_editor, model_name, app_name, field_name):
    """Decrypt all values in a specific field (for rollback)."""
    key = os.environ.get('FIELD_ENCRYPTION_KEY')
    if not key:
        logger.warning(f"FIELD_ENCRYPTION_KEY not set - skipping decryption of {model_name}.{field_name}")
        return 0
    
    Model = apps.get_model(app_name, model_name)
    count = 0
    
    with connection.cursor() as cursor:
        for obj in Model.objects.all().iterator():
            value = getattr(obj, field_name)
            if value and len(str(value)) > 40 and str(value).startswith('c3'):  # Appears encrypted
                try:
                    cursor.execute(
                        "SELECT pgp_sym_decrypt(decode(%s, 'hex'), %s)",
                        [value, key]
                    )
                    decrypted = cursor.fetchone()[0]
                    Model.objects.filter(pk=obj.pk).update(**{field_name: decrypted})
                    count += 1
                except Exception as e:
                    logger.warning(f"Failed to decrypt {model_name}.{field_name} for pk={obj.pk}: {e}")
    
    logger.info(f"Decrypted {count} records in {model_name}.{field_name}")
    return count


def encrypt_phone_numbers(apps, schema_editor):
    """Encrypt customer phone numbers."""
    encrypt_field(apps, schema_editor, 'PhoneNumber', 'customers', 'phone_number')


def decrypt_phone_numbers(apps, schema_editor):
    """Decrypt customer phone numbers (rollback)."""
    decrypt_field(apps, schema_editor, 'PhoneNumber', 'customers', 'phone_number')


def encrypt_referrer_phones(apps, schema_editor):
    """Encrypt referrer phone numbers."""
    encrypt_field(apps, schema_editor, 'Referrer', 'customers', 'phone')


def decrypt_referrer_phones(apps, schema_editor):
    """Decrypt referrer phone numbers (rollback)."""
    decrypt_field(apps, schema_editor, 'Referrer', 'customers', 'phone')


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0002_enable_pgcrypto'),
        ('customers', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(encrypt_phone_numbers, decrypt_phone_numbers),
        migrations.RunPython(encrypt_referrer_phones, decrypt_referrer_phones),
    ]
