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
        from messaging.jobs import send_pickup_reminders
        
        logger = logging.getLogger(__name__)
        
        try:
            scheduler = BackgroundScheduler(timezone=settings.TIME_ZONE)
            scheduler.add_jobstore(DjangoJobStore(), 'default')
            
            # Add pickup reminder job - runs every hour
            scheduler.add_job(
                send_pickup_reminders,
                trigger=IntervalTrigger(hours=1),
                id='send_pickup_reminders',
                name='Send Pickup Reminders',
                replace_existing=True,
                max_instances=1,
            )
            
            # Shut down the scheduler when exiting the app
            atexit.register(lambda: scheduler.shutdown(wait=False))
            
            scheduler.start()
            logger.info("APScheduler started - Pickup reminder job scheduled to run every hour")
            
        except Exception as e:
            logger.exception(f"Failed to start APScheduler: {e}")
