from django.apps import AppConfig


class MessagingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'messaging'

    def ready(self):
        """Start the APScheduler when Django starts."""
        import os
        # Only run scheduler in the main process (not in migrations, shell, etc.)
        # and only in the main runserver process (not the reloader)
        if os.environ.get('RUN_MAIN') == 'true':
            self._start_scheduler()

    def _start_scheduler(self):
        """Initialize and start the background scheduler."""
        import logging
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
            
            scheduler.start()
            logger.info("APScheduler started - Pickup reminder job scheduled to run every hour")
            
        except Exception as e:
            logger.exception(f"Failed to start APScheduler: {e}")
