"""
PostgreSQL pgcrypto encryption utilities for sensitive fields.

This module provides utilities for encrypting and decrypting sensitive data
using PostgreSQL's pgcrypto extension with AES-256 encryption.

Requires:
- PostgreSQL database with pgcrypto extension enabled
- FIELD_ENCRYPTION_KEY environment variable set
"""
import os
from django.db import connection
from django.conf import settings
from functools import wraps
import logging

logger = logging.getLogger(__name__)


def is_postgresql():
    """Check if we're connected to a PostgreSQL database."""
    try:
        return connection.vendor == 'postgresql'
    except Exception:
        return False


def get_encryption_key():
    """Get the encryption key from environment variables."""
    key = os.environ.get('FIELD_ENCRYPTION_KEY')
    if not key:
        logger.warning("FIELD_ENCRYPTION_KEY not set - data will not be encrypted!")
        return None
    return key


def encrypt_value(plaintext):
    """
    Encrypt a plaintext value using pgcrypto.
    
    Args:
        plaintext: The string value to encrypt
        
    Returns:
        The encrypted value as a hex string, or original if encryption fails/unavailable
    """
    if not plaintext:
        return plaintext
    
    # Skip encryption on non-PostgreSQL databases (MySQL, SQLite)
    if not is_postgresql():
        logger.debug("Skipping encryption - not PostgreSQL")
        return plaintext
        
    key = get_encryption_key()
    if not key:
        return plaintext
    
    try:
        with connection.cursor() as cursor:
            # Use pgp_sym_encrypt for symmetric encryption
            cursor.execute(
                "SELECT encode(pgp_sym_encrypt(%s, %s), 'hex')",
                [str(plaintext), key]
            )
            result = cursor.fetchone()
            return result[0] if result else plaintext
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return plaintext


def decrypt_value(encrypted):
    """
    Decrypt an encrypted value using pgcrypto.
    
    Args:
        encrypted: The encrypted hex string
        
    Returns:
        The decrypted plaintext value, or original if decryption fails/unavailable
    """
    if not encrypted:
        return encrypted
    
    # Skip decryption on non-PostgreSQL databases
    if not is_postgresql():
        return encrypted
    
    key = get_encryption_key()
    if not key:
        return encrypted
    
    try:
        with connection.cursor() as cursor:
            # Use pgp_sym_decrypt for symmetric decryption
            cursor.execute(
                "SELECT pgp_sym_decrypt(decode(%s, 'hex'), %s)",
                [encrypted, key]
            )
            result = cursor.fetchone()
            return result[0] if result else encrypted
    except Exception as e:
        # If decryption fails, it might be unencrypted data
        logger.debug(f"Decryption failed (may be unencrypted): {e}")
        return encrypted


def is_encrypted(value):
    """
    Check if a value appears to be encrypted (hex encoded pgcrypto output).
    
    pgcrypto PGP encrypted data starts with specific bytes when hex encoded.
    """
    if not value or not isinstance(value, str):
        return False
    
    # PGP encrypted data typically starts with 'c3' (PGP packet header)
    return len(value) > 40 and value.startswith('c3')


class EncryptedFieldMixin:
    """
    Mixin for model fields that should be encrypted at rest.
    
    Usage:
        class MyModel(models.Model):
            sensitive_field = EncryptedCharField(max_length=255)
    """
    
    def get_prep_value(self, value):
        """Encrypt value before saving to database."""
        value = super().get_prep_value(value)
        if value:
            return encrypt_value(value)
        return value
    
    def from_db_value(self, value, expression, connection):
        """Decrypt value when reading from database."""
        if value:
            return decrypt_value(value)
        return value


def encrypt_model_field(model_class, field_name, queryset=None):
    """
    Encrypt all existing values of a field in a model.
    
    This is a migration helper for encrypting existing unencrypted data.
    
    Args:
        model_class: The Django model class
        field_name: Name of the field to encrypt
        queryset: Optional queryset to limit the records (default: all)
    """
    if queryset is None:
        queryset = model_class.objects.all()
    
    key = get_encryption_key()
    if not key:
        logger.warning("No encryption key - skipping encryption migration")
        return
    
    count = 0
    for obj in queryset.iterator():
        value = getattr(obj, field_name)
        if value and not is_encrypted(value):
            encrypted = encrypt_value(value)
            # Use raw update to avoid triggering re-encryption
            model_class.objects.filter(pk=obj.pk).update(**{field_name: encrypted})
            count += 1
    
    logger.info(f"Encrypted {count} records in {model_class.__name__}.{field_name}")
    return count
