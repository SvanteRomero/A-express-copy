from django.core.management.base import BaseCommand
from common.models import Brand, Model
from Eapp.models import Task
from django.db import transaction

class Command(BaseCommand):
    help = 'Reconciles duplicate models where Brand name is part of Model name (e.g., "HP HP Elitebook" -> "HP Elitebook")'

    def add_arguments(self, parser):
        parser.add_argument(
            '--brand',
            type=str,
            default='HP',
            help='Name of the brand to reconcile',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate actions without committing changes',
        )

    def handle(self, *args, **options):
        brand_name = options['brand']
        dry_run = options['dry_run']
        
        self.stdout.write(f"Starting reconciliation for Brand: '{brand_name}' (Dry run: {dry_run})")
        
        try:
            brand = Brand.objects.get(name__iexact=brand_name)
        except Brand.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Brand '{brand_name}' not found."))
            return

        # Find models for this brand that start with the brand name (case insensitive)
        # e.g. for brand "HP", find models like "HP Elitebook" or "hp Pavilion"
        bad_models = Model.objects.filter(
            brand=brand,
            name__istartswith=brand_name
        )
        
        if not bad_models.exists():
            self.stdout.write(self.style.SUCCESS(f"No models found starting with '{brand_name}' for brand '{brand_name}'."))
            return

        for bad_model in bad_models:
            original_name = bad_model.name
            # Strip the brand name from the start. 
            # We do this carefully to preserve the rest of the string including spaces which we'll then strip.
            # python's startswith is case sensitive, so let's use string slicing based on length
            if original_name.lower().startswith(brand_name.lower()):
                clean_name = original_name[len(brand_name):].strip()
            else:
                # Should not happen due to filter, but safe guard
                continue
                
            if not clean_name:
                self.stdout.write(self.style.WARNING(f"Skipping model '{original_name}' as stripping brand leaves empty string."))
                continue

            self.stdout.write(f"\nProcessing '{original_name}' -> Target: '{clean_name}'")

            # Check if the clean model already exists for this brand
            try:
                good_model = Model.objects.get(brand=brand, name__iexact=clean_name)
                
                # Scenario A: Merge
                task_count = Task.objects.filter(laptop_model=bad_model).count()
                self.stdout.write(f"  - Found existing target Check model '{good_model.name}' (ID: {good_model.id})")
                self.stdout.write(f"  - Merging {task_count} tasks from '{original_name}' (ID: {bad_model.id}) to '{good_model.name}'")
                
                if not dry_run:
                    with transaction.atomic():
                        Task.objects.filter(laptop_model=bad_model).update(laptop_model=good_model)
                        bad_model.delete()
                    self.stdout.write(self.style.SUCCESS("  - Merge complete."))
                else:
                    self.stdout.write(self.style.WARNING("  - [DRY RUN] Would update tasks and delete bad model."))

            except Model.DoesNotExist:
                # Scenario B: Rename
                self.stdout.write(f"  - Target model '{clean_name}' does not exist.")
                self.stdout.write(f"  - Renaming '{original_name}' to '{clean_name}'")
                
                if not dry_run:
                    bad_model.name = clean_name
                    bad_model.save()
                    self.stdout.write(self.style.SUCCESS("  - Rename complete."))
                else:
                    self.stdout.write(self.style.WARNING("  - [DRY RUN] Would rename model."))

        self.stdout.write(self.style.SUCCESS("\nReconciliation process finished."))
