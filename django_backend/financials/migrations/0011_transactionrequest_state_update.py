# Step 4: State-only migration to align Django's internal migration state
# with the actual database schema after the raw SQL conversion in step 3.
#
# This tells Django that TransactionRequest now formally inherits from 
# ApprovalRequest (the schema changes were already applied via RunSQL).

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financials', '0010_convert_transactionrequest_inheritance'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Tell Django's state tracker about TransactionRequest's new shape
        # SeparateDatabaseAndState: state_operations update Django's model state
        # without running anything against the database
        migrations.SeparateDatabaseAndState(
            state_operations=[
                # Update model options
                migrations.AlterModelOptions(
                    name='transactionrequest',
                    options={'verbose_name_plural': 'Transaction Requests'},
                ),
                
                # Remove fields from Django's state (already removed from DB in step 3)
                migrations.RemoveField(
                    model_name='transactionrequest',
                    name='approver',
                ),
                migrations.RemoveField(
                    model_name='transactionrequest',
                    name='approver_name',
                ),
                migrations.RemoveField(
                    model_name='transactionrequest',
                    name='requester',
                ),
                migrations.RemoveField(
                    model_name='transactionrequest',
                    name='requester_name',
                ),
                migrations.RemoveField(
                    model_name='transactionrequest',
                    name='status',
                ),
                migrations.RemoveField(
                    model_name='transactionrequest',
                    name='created_at',
                ),
                migrations.RemoveField(
                    model_name='transactionrequest',
                    name='updated_at',
                ),
                migrations.RemoveField(
                    model_name='transactionrequest',
                    name='id',
                ),
                
                # Add the ptr field to Django's state (already in DB from step 3)
                migrations.AddField(
                    model_name='transactionrequest',
                    name='approvalrequest_ptr',
                    field=models.OneToOneField(
                        auto_created=True,
                        default=0,
                        on_delete=django.db.models.deletion.CASCADE,
                        parent_link=True,
                        primary_key=True,
                        serialize=False,
                        to='financials.approvalrequest'
                    ),
                    preserve_default=False,
                ),
            ],
            database_operations=[],  # Nothing to do - DB was updated in step 3
        ),
    ]
