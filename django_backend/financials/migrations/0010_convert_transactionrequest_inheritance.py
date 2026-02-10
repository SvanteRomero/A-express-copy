# Step 3: Convert TransactionRequest to use multi-table inheritance
# and create DebtRequest model
#
# CRITICAL: We use RunSQL to safely handle the id -> approvalrequest_ptr conversion
# because Django's default approach with AddField(default=0) would break existing rows.
# 
# Instead, we:
# 1. Add approvalrequest_ptr_id column (nullable initially)
# 2. Copy id -> approvalrequest_ptr_id (the IDs match because of step 2 data migration)
# 3. Drop the old columns and constraints
# 4. Make approvalrequest_ptr_id the new primary key

import django.db.models.deletion
from django.db import migrations, models


def convert_to_inheritance(apps, schema_editor):
    """
    Convert TransactionRequest to use multi-table inheritance by:
    1. Adding approvalrequest_ptr_id column
    2. Copying id values into it
    3. Removing old columns
    4. Setting up constraints
    """
    with schema_editor.connection.cursor() as cursor:
        # 1. Add the new approvalrequest_ptr_id column 
        cursor.execute("""
            ALTER TABLE financials_transactionrequest
            ADD COLUMN approvalrequest_ptr_id BIGINT
        """)
        
        # 2. Copy existing id values into the new ptr column
        # These IDs match the ApprovalRequest rows created in step 2
        cursor.execute("""
            UPDATE financials_transactionrequest
            SET approvalrequest_ptr_id = id
        """)
        
        # 3. Drop old constraints and columns that are now in the parent table
        
        # Drop FK constraints on requester and approver columns
        # (we need to find constraint names dynamically)
        cursor.execute("""
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_name = 'financials_transactionrequest' 
            AND constraint_type = 'FOREIGN KEY'
        """)
        fk_constraints = cursor.fetchall()
        for (constraint_name,) in fk_constraints:
            # Only drop FK constraints for columns we're removing
            cursor.execute(f"""
                SELECT column_name FROM information_schema.constraint_column_usage
                WHERE constraint_name = %s
            """, [constraint_name])
            cols = [r[0] for r in cursor.fetchall()]
            # Check if this FK is for requester_id, approver_id (columns we're removing)
            cursor.execute(f"""
                SELECT column_name FROM information_schema.key_column_usage
                WHERE constraint_name = %s AND table_name = 'financials_transactionrequest'
            """, [constraint_name])
            source_cols = [r[0] for r in cursor.fetchall()]
            if any(c in ['requester_id', 'approver_id'] for c in source_cols):
                cursor.execute(f'ALTER TABLE financials_transactionrequest DROP CONSTRAINT "{constraint_name}"')
        
        # Drop the old primary key constraint
        cursor.execute("""
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_name = 'financials_transactionrequest' 
            AND constraint_type = 'PRIMARY KEY'
        """)
        pk_result = cursor.fetchone()
        if pk_result:
            cursor.execute(f'ALTER TABLE financials_transactionrequest DROP CONSTRAINT "{pk_result[0]}"')
        
        # Drop old columns that are now in ApprovalRequest parent table
        for col in ['id', 'status', 'requester_id', 'approver_id', 
                     'requester_name', 'approver_name', 'created_at', 'updated_at']:
            try:
                cursor.execute(f'ALTER TABLE financials_transactionrequest DROP COLUMN IF EXISTS "{col}"')
            except Exception:
                pass  # Column may not exist
        
        # 4. Set up the new primary key and FK constraint
        cursor.execute("""
            ALTER TABLE financials_transactionrequest
            ALTER COLUMN approvalrequest_ptr_id SET NOT NULL
        """)
        
        cursor.execute("""
            ALTER TABLE financials_transactionrequest
            ADD PRIMARY KEY (approvalrequest_ptr_id)
        """)
        
        cursor.execute("""
            ALTER TABLE financials_transactionrequest
            ADD CONSTRAINT financials_transactionrequest_approvalrequest_ptr_id_fk
            FOREIGN KEY (approvalrequest_ptr_id) 
            REFERENCES financials_approvalrequest(id)
            ON DELETE CASCADE
            DEFERRABLE INITIALLY DEFERRED
        """)
        
        # Drop any remaining indexes on removed columns
        cursor.execute("""
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'financials_transactionrequest'
            AND indexname LIKE '%requester%' OR indexname LIKE '%approver%'
            OR indexname LIKE '%status%' OR indexname LIKE '%created_at%'
        """)
        for (idx_name,) in cursor.fetchall():
            try:
                cursor.execute(f'DROP INDEX IF EXISTS "{idx_name}"')
            except Exception:
                pass


def reverse_convert(apps, schema_editor):
    """
    Reverse: convert back from inheritance to standalone table.
    This copies data back from ApprovalRequest parent into TransactionRequest.
    """
    with schema_editor.connection.cursor() as cursor:
        # Add back the old columns
        cursor.execute("""
            ALTER TABLE financials_transactionrequest
            ADD COLUMN id BIGSERIAL,
            ADD COLUMN status VARCHAR(20) DEFAULT 'Pending',
            ADD COLUMN requester_id BIGINT,
            ADD COLUMN approver_id BIGINT,
            ADD COLUMN requester_name VARCHAR(150),
            ADD COLUMN approver_name VARCHAR(150),
            ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(),
            ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()
        """)
        
        # Copy data back from ApprovalRequest
        cursor.execute("""
            UPDATE financials_transactionrequest tr
            SET id = ar.id,
                status = ar.status,
                requester_id = ar.requester_id,
                approver_id = ar.approver_id,
                requester_name = ar.requester_name,
                approver_name = ar.approver_name,
                created_at = ar.created_at,
                updated_at = ar.updated_at
            FROM financials_approvalrequest ar
            WHERE tr.approvalrequest_ptr_id = ar.id
        """)
        
        # Drop the FK and ptr column, restore old PK
        cursor.execute("""
            ALTER TABLE financials_transactionrequest
            DROP CONSTRAINT IF EXISTS financials_transactionrequest_approvalrequest_ptr_id_fk
        """)
        cursor.execute("""
            ALTER TABLE financials_transactionrequest
            DROP CONSTRAINT IF EXISTS financials_transactionrequest_pkey
        """)
        cursor.execute("""
            ALTER TABLE financials_transactionrequest
            DROP COLUMN approvalrequest_ptr_id
        """)
        cursor.execute("""
            ALTER TABLE financials_transactionrequest
            ADD PRIMARY KEY (id)
        """)


class Migration(migrations.Migration):

    dependencies = [
        ('Eapp', '0015_add_to_be_checked_field'),
        ('financials', '0009_backfill_approval_requests'),
    ]

    operations = [
        # Use RunPython for safe conversion with raw SQL
        migrations.RunPython(
            convert_to_inheritance,
            reverse_convert,
        ),
        
        # Create DebtRequest model (new table, no migration risk)
        migrations.CreateModel(
            name='DebtRequest',
            fields=[
                ('approvalrequest_ptr', models.OneToOneField(
                    auto_created=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    parent_link=True,
                    primary_key=True,
                    serialize=False,
                    to='financials.approvalrequest'
                )),
                ('task_title', models.CharField(blank=True, max_length=255)),
                ('task', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='debt_requests',
                    to='Eapp.task'
                )),
            ],
            options={
                'verbose_name_plural': 'Debt Requests',
            },
            bases=('financials.approvalrequest',),
        ),
    ]
