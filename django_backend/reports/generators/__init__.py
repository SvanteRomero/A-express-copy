# reports/generators/__init__.py
"""Report generators organized by domain."""
from .base import ReportGeneratorBase
from .financial import FinancialReportGenerator
from .operational import OperationalReportGenerator
from .technician import TechnicianReportGenerator
from .front_desk import FrontDeskReportGenerator

__all__ = [
    'ReportGeneratorBase',
    'FinancialReportGenerator',
    'OperationalReportGenerator',
    'TechnicianReportGenerator',
    'FrontDeskReportGenerator',
]
