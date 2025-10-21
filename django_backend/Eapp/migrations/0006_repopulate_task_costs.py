from django.db import migrations
from decimal import Decimal

def populate_task_costs(apps, schema_editor):
    Task = apps.get_model('Eapp', 'Task')
    for task in Task.objects.all():
        # Calculate total_cost
        estimated_cost = task.estimated_cost or Decimal('0.00')
        additive_costs = sum(item.amount for item in task.cost_breakdowns.filter(cost_type='Additive'))
        subtractive_costs = sum(item.amount for item in task.cost_breakdowns.filter(cost_type='Subtractive'))
        task.total_cost = estimated_cost + additive_costs - subtractive_costs

        # Calculate paid_amount
        task.paid_amount = sum(p.amount for p in task.payments.all()) or Decimal('0.00')

        task.save(update_fields=['total_cost', 'paid_amount'])

class Migration(migrations.Migration):

    dependencies = [
        ('Eapp', '0005_populate_task_costs'),
    ]

    operations = [
        migrations.RunPython(populate_task_costs),
    ]