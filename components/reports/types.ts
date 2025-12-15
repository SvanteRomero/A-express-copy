/**
 * Centralized Report Type Definitions
 * All report-related interfaces consolidated in one place
 */

// ==========================================
// Base/Common Types
// ==========================================

export interface PaginationInfo {
    current_page: number;
    page_size: number;
    total_tasks: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
    
}

// ==========================================
// Task-Related Types
// ==========================================

export interface TaskDetail {
    task_id: number;
    task_title: string;
    customer_name: string;
    laptop_model: string;
    brand?: string;
    status?: string;
    urgency?: string;
    assigned_technician?: string;
    date_in: string;
    days_in_shop?: number;
    estimated_cost: number;
    total_cost?: number;
    paid_amount?: number;
    // Turnaround specific fields
    intake_date?: string;
    intake_time?: string;
    pickup_date?: string;
    pickup_time?: string;
    turnaround_days?: number;
}

export interface CompletedTaskDetail {
    task_id: number;
    task_title: string;
    completion_hours: number;
    revenue: number;
}

export interface OutstandingTask {
    task_id: string;
    customer_name: string;
    customer_phone: string;
    total_cost: number;
    paid_amount: number;
    outstanding_balance: number;
    days_overdue: number;
    status: string;
    date_in: string;
}

// ==========================================
// Financial Reports
// ==========================================

export interface OutstandingPaymentsReport {
    outstanding_tasks: OutstandingTask[];
    summary: {
        total_outstanding: number;
        task_count: number;
        average_balance: number;
    };
    pagination?: PaginationInfo;
}

export interface PaymentMethodsReport {
    payment_methods?: {
        method_name: string;
        total_amount: number;
        payment_count: number;
        average_payment: number;
        percentage: number;
    }[];
    revenue_methods?: {
        method_name: string;
        total_amount: number;
        payment_count: number;
        average_payment: number;
        percentage: number;
    }[];
    expenditure_methods?: {
        method_name: string;
        total_amount: number;
        payment_count: number;
        average_payment: number;
        percentage: number;
    }[];
    summary: {
        total_revenue: number;
        total_expenditure?: number;
        net_revenue?: number;
        total_payments: number;
        date_range: string;
    };
}

export interface RevenueSummaryReport {
    payments_by_date: {
        date: string;
        daily_revenue: number;
    }[];
    monthly_totals: {
        total_revenue: number;
        total_refunds: number;
        net_revenue: number;
        average_payment: number;
        payment_count: number;
        refund_count: number;
    };
    payment_methods: {
        method__name: string;
        total: number;
        count: number;
    }[];
    date_range: string;
    duration_info: {
        days: number;
        description: string;
    };
    start_date?: string;
    end_date?: string;
    pagination?: PaginationInfo;
}

// ==========================================
// Operational Reports
// ==========================================

export interface TaskStatusReport {
    statuses?: {
        name: string;
        value: number;
        color: string;
    }[];
    status_distribution?: {
        status: string;
        count: number;
        percentage: number;
    }[];
    urgency_distribution?: {
        urgency: string;
        count: number;
    }[];
    total_tasks?: number;
    summary?: {
        total_tasks: number;
        completed_tasks: number;
        in_progress_tasks: number;
    };
    popular_brand?: string;
    popular_model?: string;
    top_brands?: { brand__name: string; count: number }[];
    top_models?: { laptop_model: string; count: number }[];
}

export interface TurnaroundTimeReport {
    periods?: {
        period: string;
        average_turnaround: number;
        tasks_completed: number;
    }[];
    task_details?: TaskDetail[];
    summary?: {
        overall_average: number;
        best_period: string;
        improvement: number;
        total_tasks_analyzed: number;
        total_returns?: number;
        tasks_with_returns?: number;
        avg_returns_per_task?: number;
    };
    date_range?: string;
    duration_info?: {
        days: number;
        description: string;
    };
    start_date?: string;
    end_date?: string;
    pagination?: PaginationInfo;
}

export interface LocationData {
    location: string;
    total_tasks?: number;
    laptop_count?: number;
    capacity?: number;
    utilization?: number;
    avg_days_in_shop?: number;
    status_breakdown?: {
        status: string;
        count: number;
        percentage: number;
    }[];
    urgency_breakdown?: {
        urgency: string;
        count: number;
        percentage: number;
    }[];
    tasks?: TaskDetail[];
}

export interface InventoryLocationReport {
    locations: LocationData[];
    summary: {
        total_laptops_in_shop?: number;
        total_laptops?: number;
        total_capacity?: number;
        overall_utilization?: number;
        total_locations?: number;
        overall_avg_days_in_shop?: number;
        most_busy_location?: string;
        most_busy_location_count?: number;
    };
}

// ==========================================
// Technician Reports
// ==========================================

export interface TechnicianPerformance {
    technician_id: number;
    technician_name: string;
    technician_email: string;
    completed_tasks_count: number;
    total_revenue_generated?: number;
    avg_completion_hours: number;
    current_in_progress_tasks?: number;
    current_assigned_tasks: number;
    tasks_sent_to_workshop?: number;
    workshop_rate?: number;
    percentage_of_tasks_involved?: number;
    tasks_by_status: {
        [status: string]: TaskDetail[];
    };
    status_counts: {
        [status: string]: number;
    };
    completed_tasks_detail?: CompletedTaskDetail[];
    total_tasks_handled: number;
    completion_rate?: number;
    workload_level?: string;
}

export interface TechnicianPerformanceReport {
    technician_performance: TechnicianPerformance[];
    date_range: string;
    total_technicians: number;
    summary: {
        total_completed_tasks: number;
        total_revenue?: number;
        avg_completion_hours?: number;
        total_current_tasks: number;
        total_tasks_in_period?: number;
    };
}

export interface TechnicianWorkloadReport {
    workload_data?: {
        name: string;
        tasks: number;
        in_progress: number;
        awaiting_parts: number;
        pending: number;
    }[];
    technicians?: {
        technician_name?: string;
        name?: string;
        assigned_tasks: number;
        open_tasks?: number;
        overdue_tasks?: number;
        workload_level: string;
    }[];
    technician_workload?: {
        technician_name?: string;
        name?: string;
        assigned_tasks: number;
        open_tasks?: number;
        overdue_tasks?: number;
        workload_level: string;
    }[];
    summary?: {
        total_tasks: number;
        avg_tasks_per_technician: number;
    };
    total_tasks?: number;
    date_range?: string;
    total_active_technicians?: number;
    total_assigned_tasks?: number;
}

export interface FrontDeskPerformanceData {
    user_name: string;
    approved_count: number;
    sent_out_count: number;
    approved_percentage: number;
    sent_out_percentage: number;
}

export interface FrontDeskPerformanceReport {
    performance: FrontDeskPerformanceData[];
    summary: {
        total_approved: number;
        total_sent_out: number;
        start_date: string;
        end_date: string;
    };
}
