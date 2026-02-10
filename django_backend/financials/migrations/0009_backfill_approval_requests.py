# Step 2: Data migration - create ApprovalRequest parent rows for existing TransactionRequests
# and link them via approvalrequest_ptr

from django.db import migrations


def create_parent_approval_requests(apps, schema_editor):
    """
    For each existing TransactionRequest, create a corresponding ApprovalRequest row
    and store the mapping so the next migration can set up the FK.
    
    We use raw SQL because the ORM models may not match the current schema during migration.
    """
    db_alias = schema_editor.connection.alias
    
    # Use raw SQL to read existing TransactionRequest data
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, status, requester_id, approver_id, 
                   requester_name, approver_name, created_at, updated_at
            FROM financials_transactionrequest
        """)
        rows = cursor.fetchall()
    
    if not rows:
        return
    
    # Insert into ApprovalRequest table, using the SAME id as the TransactionRequest
    # This ensures the approvalrequest_ptr can point to it directly
    with schema_editor.connection.cursor() as cursor:
        for row in rows:
            tr_id, status, requester_id, approver_id, req_name, app_name, created_at, updated_at = row
            cursor.execute("""
                INSERT INTO financials_approvalrequest 
                    (id, status, requester_id, approver_id, requester_name, approver_name, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, [tr_id, status, requester_id, approver_id, req_name, app_name, created_at, updated_at])
        
        # Update the sequence to avoid conflicts with future inserts
        # Get the max id
        cursor.execute("SELECT COALESCE(MAX(id), 0) FROM financials_approvalrequest")
        max_id = cursor.fetchone()[0]
        if max_id > 0:
            cursor.execute(
                "SELECT setval(pg_get_serial_sequence('financials_approvalrequest', 'id'), %s, true)",
                [max_id]
            )


def reverse_create_parent(apps, schema_editor):
    """Reverse: delete all ApprovalRequest rows (they'll be orphaned anyway)."""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("DELETE FROM financials_approvalrequest")


class Migration(migrations.Migration):

    dependencies = [
        ('financials', '0008_approvalrequest_alter_transactionrequest_options_and_more'),
    ]

    operations = [
        migrations.RunPython(
            create_parent_approval_requests,
            reverse_create_parent,
        ),
    ]
