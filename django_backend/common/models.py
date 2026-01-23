from django.db import models

class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']



class ActiveLocationManager(models.Manager):
    """Manager that returns only active locations."""
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


class Location(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_workshop = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)

    # Default manager returns all locations
    objects = models.Manager()
    # Custom manager for active locations only
    active_objects = ActiveLocationManager()

    def __str__(self):
        return self.name

    def delete(self, *args, **kwargs):
        """Soft delete: mark as inactive instead of removing from database."""
        self.is_active = False
        self.save(update_fields=['is_active'])

    def hard_delete(self):
        """Permanently delete the location (use with caution)."""
        super().delete()

    class Meta:
        ordering = ['-is_active', 'name']  # Active locations first, then alphabetical

class Model(models.Model):
    name = models.CharField(max_length=100)
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='models')

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        unique_together = ['name', 'brand']