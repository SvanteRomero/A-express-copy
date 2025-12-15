"""
Custom management command to create a superuser from environment variables.
Usage: python manage.py create_superuser_from_env

Set these environment variables in Railway:
- DJANGO_SUPERUSER_EMAIL
- DJANGO_SUPERUSER_PASSWORD
"""

import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Create a superuser from environment variables (non-interactive)"

    def handle(self, *args, **options):
        User = get_user_model()
        
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
        
        if not email or not password:
            self.stdout.write(
                self.style.WARNING(
                    "DJANGO_SUPERUSER_EMAIL and DJANGO_SUPERUSER_PASSWORD must be set"
                )
            )
            return
        
        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(f"Superuser with email {email} already exists")
            )
            return
        
        # Create the superuser
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name="Admin",
            last_name="User",
            username = "admin",
            role = "Manager"
        )
        
        self.stdout.write(
            self.style.SUCCESS(f"Superuser {email} created successfully!")
        )
