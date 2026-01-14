import os
import sys
from django.apps import AppConfig


class MessagingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'messaging'

    def ready(self):
        """Schedule the APScheduler to start after Django is fully loaded."""
        # Skip scheduler in migrations, shell, tests, or other management commands
        is_runserver = 'runserver' in sys.argv
        is_main_process = os.environ.get('RUN_MAIN') == 'true'
        
        # Check for production WSGI servers (Gunicorn, uWSGI)
        is_gunicorn = 'gunicorn' in sys.argv[0] if sys.argv else False
        is_uwsgi = 'uwsgi' in sys.argv[0] if sys.argv else False
        
        # Allow explicit scheduler start via environment variable for other WSGI servers
        force_scheduler = os.environ.get('DJANGO_START_SCHEDULER') == 'true'
        
        # Start scheduler in dev (runserver) or in production (gunicorn/uwsgi/env var)
        should_start = (is_runserver and is_main_process) or is_gunicorn or is_uwsgi or force_scheduler
        
        if should_start:
            # Use timer to defer startup until after Django is fully initialized
            import threading
            timer = threading.Timer(2.0, self._start_scheduler)
            timer.daemon = True
            timer.start()

    def _start_scheduler(self):
        """Initialize and start the background scheduler."""
        import logging
        import atexit
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.interval import IntervalTrigger
        from django_apscheduler.jobstores import DjangoJobStore
        from django.conf import settings
        from django.db import IntegrityError
        from messaging.jobs import send_pickup_reminders
        
        logger = logging.getLogger(__name__)
        logger.warning("=== APScheduler: Starting scheduler initialization ===")
        
        try:
            scheduler = BackgroundScheduler(timezone=settings.TIME_ZONE)
            scheduler.add_jobstore(DjangoJobStore(), 'default')
            
            # Start scheduler FIRST before adding jobs
            scheduler.start()
            logger.warning("APScheduler: Scheduler started successfully")
            
            # Now add/update the job - handle duplicate key gracefully
            job_id = 'send_pickup_reminders'
            try:
                # Try to remove existing job first to avoid duplicate key error
                existing_job = scheduler.get_job(job_id)
                if existing_job:
                    scheduler.remove_job(job_id)
                    logger.warning(f"APScheduler: Removed existing job '{job_id}'")
                
                # Add the job fresh
                scheduler.add_job(
                    send_pickup_reminders,
                    trigger=IntervalTrigger(hours=1),
                    id=job_id,
                    name='Send Pickup Reminders',
                    replace_existing=True,
                    max_instances=1,
                )
                logger.warning(f"APScheduler: Job '{job_id}' scheduled to run every hour")
                
            except IntegrityError as e:
                # Job already exists in DB - this is fine, scheduler will pick it up
                logger.warning(f"APScheduler: Job '{job_id}' already exists in database, will use existing schedule")
            except Exception as job_error:
                logger.exception(f"APScheduler: Error adding job: {job_error}")
            
            # --- Debt Reminders Job ---
            from messaging.jobs import send_debt_reminders
            job_id_debt = 'send_debt_reminders'
            try:
                existing_job = scheduler.get_job(job_id_debt)
                if existing_job:
                    scheduler.remove_job(job_id_debt)
                    logger.warning(f"APScheduler: Removed existing job '{job_id_debt}'")
                
                scheduler.add_job(
                    send_debt_reminders,
                    trigger=IntervalTrigger(hours=1),
                    id=job_id_debt,
                    name='Send Debt Reminders',
                    replace_existing=True,
                    max_instances=1,
                )
                logger.warning(f"APScheduler: Job '{job_id_debt}' scheduled to run every hour")
                
            except IntegrityError as e:
                logger.warning(f"APScheduler: Job '{job_id_debt}' already exists in database, will use existing schedule")
            except Exception as job_error:
                logger.exception(f"APScheduler: Error adding debt reminder job: {job_error}")
            
            # Shut down the scheduler when exiting the app
            atexit.register(lambda: scheduler.shutdown(wait=False))
            
            logger.warning("=== APScheduler: Initialization complete ===")
            
        except Exception as e:
            logger.exception(f"Failed to start APScheduler: {e}")
