from django.core.management.base import BaseCommand
from common.models import Brand, Model
from Eapp.models import Task
from django.db import transaction
from django.db.models import Count

class Command(BaseCommand):
    help = 'Automatically deduplicates models for a brand by grouping them by case-insensitive name'

    def add_arguments(self, parser):
        parser.add_argument(
            '--brand',
            type=str,
            required=True,
            help='Name of the brand to deduplicate',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate actions without committing changes',
        )

    def handle(self, *args, **options):
        brand_name = options['brand']
        dry_run = options['dry_run']
        
        self.stdout.write(f"Starting auto-deduplication for Brand: '{brand_name}' (Dry run: {dry_run})")
        
        try:
            brand = Brand.objects.get(name__iexact=brand_name)
        except Brand.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Brand '{brand_name}' not found."))
            return

        # 1. Fetch all models for this brand
        all_models = list(Model.objects.filter(brand=brand))
        
        # 2. Group by normalized name
        from collections import defaultdict
        grouped = defaultdict(list)
        
        for m in all_models:
            normalized_name = m.name.strip().lower()
            grouped[normalized_name].append(m)

        # 3. Process groups with duplicates
        duplicates_found = 0
        
        for norm_name, models_in_group in grouped.items():
            if len(models_in_group) < 2:
                continue
                
            duplicates_found += 1
            self.stdout.write(f"\nFound duplicate group for '{norm_name}': {[m.name for m in models_in_group]}")
            
            # 4. Determine Target (Best Model)
            # Priority: 
            # 1. Matches Title Case (heuristic for "cleaner" name)
            # 2. Most tasks (to minimize updates)
            # 3. Oldest ID (stability)
            
            # Augment models with task counts for decision making
            for m in models_in_group:
                m._task_count = Task.objects.filter(laptop_model=m).count()
                
            def score_model(m):
                # Higher score is better
                score = 0
                if m.name == m.name.title(): # Prefer "Pavilion" over "PAVILION"
                    score += 1000
                if m.name == m.name.strip(): # Prefer no whitespace
                    score += 100
                score += m._task_count # Prefer one with data
                return score
            
            # Sort by score descending, then by ID ascending (prefer older)
            models_in_group.sort(key=lambda m: (-score_model(m), m.id))
            
            target_model = models_in_group[0]
            models_to_merge = models_in_group[1:]
            
            self.stdout.write(f"  -> Selected Target: '{target_model.name}' (ID: {target_model.id}, Tasks: {target_model._task_count})")
            
            for source_model in models_to_merge:
                self.stdout.write(f"  -> Merging from: '{source_model.name}' (ID: {source_model.id}, Tasks: {source_model._task_count})")
                
                if not dry_run:
                    with transaction.atomic():
                        # Move tasks
                        updated_count = Task.objects.filter(laptop_model=source_model).update(laptop_model=target_model)
                        # Delete source
                        source_model.delete()
                    self.stdout.write(self.style.SUCCESS(f"     [OK] Moved {updated_count} tasks and deleted source."))
                else:
                    self.stdout.write(self.style.WARNING(f"     [DRY RUN] Would move tasks and delete source."))

        if duplicates_found == 0:
            self.stdout.write(self.style.SUCCESS(f"No duplicates found for brand '{brand_name}'."))
        else:
            self.stdout.write(self.style.SUCCESS(f"\nProcessed {duplicates_found} groups of duplicates."))
