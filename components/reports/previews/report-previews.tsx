"use client"

import { OutstandingPaymentsPreview } from "./outstanding-payments-preview"
import { TechnicianPerformancePreview } from "./technician-performance-preview"
import { TaskStatusPreview } from "./task-status-preview"
import { TechnicianWorkloadPreview } from "./technician-workload-preview"
import { PaymentMethodsPreview } from "./payment-methods-preview"
import { TurnaroundTimePreview } from "./turnaround-time-preview"
import { GenericReportPreview } from "./generic-report-preview"
import { FrontDeskPerformancePreview } from "./front-desk-performance-preview"
import type {
    OutstandingPaymentsReport,
    TechnicianPerformanceReport,
    TaskStatusReport,
    TechnicianWorkloadReport,
    PaymentMethodsReport,
    InventoryLocationReport,
    FrontDeskPerformanceReport,
} from "../types"

interface ReportPreviewProps {
    type: string;
    data: any;
    searchTerm: string;
    onPageChange?: (page: number, pageSize: number) => void;
    isLoading?: boolean;
}

export const ReportPreview = ({
    type,
    data,
    searchTerm,
    onPageChange,
    isLoading = false
}: ReportPreviewProps) => {

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
        case "task_status":
            return <TaskStatusPreview report={data as TaskStatusReport} />
        case "technician_workload":
            return <TechnicianWorkloadPreview report={data as TechnicianWorkloadReport} />
        case "payment_methods":
            return <PaymentMethodsPreview report={data as PaymentMethodsReport} />
        case "front_desk_performance":
            return <FrontDeskPerformancePreview data={data as FrontDeskPerformanceReport} />
        default:
            return <GenericReportPreview report={data} />
    }
}