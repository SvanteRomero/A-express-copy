#!/bin/bash
set -e

# Collect static files
python manage.py collectstatic --noinput

# Run database migrations
python manage.py migrate

# Run data reconciliation commands
python manage.py reconcile_models
python manage.py deduplicate_models
python manage.py backfill_ready_timestamps

# Cleanup stale records
python manage.py clear_paid_debts
python manage.py cleanup_approved_debts

# Create superuser if configured
python manage.py create_superuser_from_env

# Start the ASGI server
daphne -b 0.0.0.0 -p $PORT A_express.asgi:application
