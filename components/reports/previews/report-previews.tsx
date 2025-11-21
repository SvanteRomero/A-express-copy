"use client"

import { OutstandingPaymentsPreview } from "./outstanding-payments-preview"
import { TechnicianPerformancePreview } from "./technician-performance-preview"
import { RevenueSummaryPreview } from "./revenue-summary-preview"
import { TaskStatusPreview } from "./task-status-preview"
import { TechnicianWorkloadPreview } from "./technician-workload-preview"
import { PaymentMethodsPreview } from "./payment-methods-preview"
import { TurnaroundTimePreview } from "./turnaround-time-preview"
import { InventoryLocationPreview } from "./inventory-location-preview"
import { GenericReportPreview } from "./generic-report-preview"

// Extended interfaces for all report types
interface OutstandingTask {
    task_id: string
    customer_name: string
    customer_phone: string
    total_cost: number
    paid_amount: number
    outstanding_balance: number
    days_overdue: number
    status: string
    date_in: string
}

interface OutstandingPaymentsReport {
    outstanding_tasks: OutstandingTask[]
    summary: {
        total_outstanding: number
        task_count: number
        average_balance: number
    }
}

interface TaskDetail {
    task_id: number
    task_title: string
    customer_name: string
    laptop_model: string
    date_in: string
    estimated_cost: number
    total_cost: number
    paid_amount: number
}

interface CompletedTaskDetail {
    task_id: number
    task_title: string
    completion_hours: number
    revenue: number
}

interface TechnicianPerformance {
    technician_id: number
    technician_name: string
    technician_email: string
    completed_tasks_count: number
    total_revenue_generated: number
    avg_completion_hours: number
    current_in_progress_tasks: number
    current_assigned_tasks: number
    tasks_by_status: {
        [status: string]: TaskDetail[]
    }
    status_counts: {
        [status: string]: number
    }
    completed_tasks_detail: CompletedTaskDetail[]
    total_tasks_handled: number
    completion_rate: number
    workload_level: string
}

interface TechnicianPerformanceReport {
    technician_performance: TechnicianPerformance[]
    date_range: string
    total_technicians: number
    summary: {
        total_completed_tasks: number
        total_revenue: number
        avg_completion_hours: number
        total_current_tasks: number
    }
}

interface RevenueSummaryReport {
    payments_by_date: {
        date: string
        daily_revenue: number
    }[]
    monthly_totals: {
        total_revenue: number
        total_refunds: number
        net_revenue: number
        average_payment: number
        payment_count: number
        refund_count: number
    }
    payment_methods: {
        method__name: string
        total: number
        count: number
    }[]
    date_range: string
    duration_info: {
        days: number
        description: string
    }
    start_date?: string
    end_date?: string
    pagination?: {
        current_page: number
        page_size: number
        total_payments: number
        total_pages: number
        has_next: boolean
        has_previous: boolean
    }
}


interface TaskStatusReport {
    statuses: {
        name: string
        value: number
        color: string
    }[]
    summary: {
        total_tasks: number
        completed_tasks: number
        in_progress_tasks: number
    }
}

interface TechnicianWorkloadReport {
    workload_data: {
        name: string
        tasks: number
        in_progress: number
        awaiting_parts: number
        pending: number
    }[]
    total_active_technicians: number
    total_assigned_tasks: number
}

interface PaymentMethodsReport {
    payment_methods: {
        method_name: string
        total_amount: number
        payment_count: number
        average_payment: number
        percentage: number
    }[]
    summary: {
        total_revenue: number
        total_payments: number
        date_range: string
    }
}

interface PaginationInfo {
    current_page: number
    page_size: number
    total_tasks: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
}

interface TurnaroundTimeReport {
    periods: {
        period: string
        average_turnaround: number
        tasks_completed: number
    }[]
    task_details: TaskDetail[]
    summary: {
        overall_average: number
        best_period: string
        improvement: number
        total_tasks_analyzed: number
        total_returns?: number
        tasks_with_returns?: number
        avg_returns_per_task?: number
    }
    date_range?: string
    duration_info?: {
        days: number
        description: string
    }
    start_date?: string
    end_date?: string
    pagination?: PaginationInfo
}

interface TaskDetail {
    task_id: number
    task_title: string
    customer_name: string
    laptop_model: string
    brand: string
    status: string
    urgency: string
    assigned_technician: string
    date_in: string
    days_in_shop: number
    estimated_cost: number
}

interface LocationData {
    location: string
    total_tasks: number
    avg_days_in_shop: number
    status_breakdown: {
        status: string
        count: number
        percentage: number
    }[]
    urgency_breakdown: {
        urgency: string
        count: number
        percentage: number
    }[]
    tasks: TaskDetail[]
}

interface InventoryLocationReport {
    locations: LocationData[]
    summary: {
        total_laptops_in_shop: number
        total_locations: number
        overall_avg_days_in_shop: number
        most_busy_location: string
        most_busy_location_count: number
    }
}

export const ReportPreview = ({
    type,
    data,
    searchTerm,
    onPageChange,
    isLoading = false
}: {
    type: string,
    data: any,
    searchTerm: string,
    onPageChange?: (page: number, pageSize: number) => void,
    isLoading?: boolean
}) => {

    switch (type) {
        case "outstanding_payments":
            return (
                <OutstandingPaymentsPreview
                    report={data as OutstandingPaymentsReport}
                    searchTerm={searchTerm}
                    onPageChange={onPageChange || (() => { })}
                    isLoading={isLoading}
                />
            )
        case "turnaround_time":
            return (
                <TurnaroundTimePreview
                    report={data}
                    searchTerm={searchTerm}
                    onPageChange={onPageChange || (() => { })}
                    isLoading={isLoading}
                />
            )
        case "technician_performance":
            return <TechnicianPerformancePreview report={data as TechnicianPerformanceReport} />
        case "revenue_summary":
            return (
                <RevenueSummaryPreview
                    report={data as RevenueSummaryReport}
                    onPageChange={onPageChange}
                />
            )
        case "task_status":
            return <TaskStatusPreview report={data as TaskStatusReport} />
        case "technician_workload":
            return <TechnicianWorkloadPreview report={data as TechnicianWorkloadReport} />
        case "payment_methods":
            return <PaymentMethodsPreview report={data as PaymentMethodsReport} />
        case "turnaround_time":
            return <TurnaroundTimePreview report={data} />
        case "laptops_in_shop_by_location":
            return <InventoryLocationPreview report={data as InventoryLocationReport} />
        default:
            return <GenericReportPreview report={data} />
    }
}