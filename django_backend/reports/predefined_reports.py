# Eapp/reports/predefined_reports.py
"""
Report generation facade maintaining backward compatibility.

This module provides a unified interface for all report types,
delegating to specialized generators organized by domain.
"""
from .generators.financial import FinancialReportGenerator
from .generators.operational import OperationalReportGenerator
from .generators.technician import TechnicianReportGenerator
from .generators.front_desk import FrontDeskReportGenerator
from .generators.base import ReportGeneratorBase


class PredefinedReportGenerator:
    """
    Main report generator facade.
    
    Delegates to specialized generators for backward compatibility.
    All existing code using this class continues to work unchanged.
    
    New code can import generators directly from .generators package.
    """
    
    # ===== Financial Reports =====
    
    @staticmethod
    def generate_outstanding_payments_report(*args, **kwargs):
        """Generate outstanding payments report."""
        return FinancialReportGenerator.generate_outstanding_payments(*args, **kwargs)
    
    @staticmethod
    def generate_payment_methods_report(*args, **kwargs):
        """Generate payment methods breakdown report."""
        return FinancialReportGenerator.generate_payment_methods(*args, **kwargs)
    
    @staticmethod
    def generate_revenue_overview_report(*args, **kwargs):
        """Generate revenue overview report."""
        return FinancialReportGenerator.generate_revenue_overview(*args, **kwargs)
    
    # ===== Operational Reports =====
    
    @staticmethod
    def generate_task_status_report(*args, **kwargs):
        """Generate task status overview report."""
        return OperationalReportGenerator.generate_task_status(*args, **kwargs)
    
    @staticmethod
    def generate_task_execution_report(*args, **kwargs):
        """Generate task execution report."""
        return OperationalReportGenerator.generate_task_execution(*args, **kwargs)
    
    # ===== Technician Reports =====
    
    @staticmethod
    def generate_technician_performance_report(*args, **kwargs):
        """Generate technician performance report."""
        return TechnicianReportGenerator.generate_performance(*args, **kwargs)
    
    @staticmethod
    def generate_technician_workload_report(*args, **kwargs):
        """Generate technician workload report."""
        return TechnicianReportGenerator.generate_workload(*args, **kwargs)
    
    # ===== Front Desk Reports =====
    
    @staticmethod
    def generate_front_desk_performance_report(*args, **kwargs):
        """Generate front desk performance report."""
        return FrontDeskReportGenerator.generate_performance(*args, **kwargs)
    
    # ===== Shared Utilities =====
    
    @staticmethod
    def _get_date_filter(*args, **kwargs):
        """
        Helper method to create date filters (backward compatibility).
        
        New code should use ReportGeneratorBase.get_date_filter() directly.
        """
        return ReportGeneratorBase.get_date_filter(*args, **kwargs)