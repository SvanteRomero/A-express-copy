import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

try:
    from reports.predefined_reports import PredefinedReportGenerator
    result = PredefinedReportGenerator.generate_outstanding_payments_report()
    print("SUCCESS:", result)
except Exception as e:
    import traceback
    traceback.print_exc()
