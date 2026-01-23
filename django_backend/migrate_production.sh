#!/bin/bash
# Production migration script for Railway
# This handles the migration sequence after the 0006 conflict
# Run this ONCE, then switch back to normal migration flow

echo "Starting production migration sequence..."

# Fake 0006 (original_location_snapshot change already exists in production)
echo "Faking migration 0006..."
python manage.py migrate Eapp 0006 --fake

# Run 0007 (adds is_terminated field)
echo "Running migration 0007..."
python manage.py migrate Eapp 0007

# Fake 0008 (merge migration, no actual changes)
echo "Faking migration 0008..."
python manage.py migrate Eapp 0008 --fake

# Run 0009 (alter task status)
echo "Running migration 0009..."
python manage.py migrate Eapp 0009

# Run all remaining migrations
echo "Running all remaining migrations..."
python manage.py migrate

echo "Migration sequence complete!"
