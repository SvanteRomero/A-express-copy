import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_COLORS } from "../pdf-types";
import {
    addReportTitle,
    addSectionHeader,
    addSummaryTable,
    formatCurrency,
    getLastTableY,
} from "../pdf-helpers";

/**
 * Generate Outstanding Payments PDF content
 */
export const generateOutstandingPaymentsPDF = (
    pdf: jsPDF,
    data: any,
    startY: number
): void => {
    let yPosition = addReportTitle(pdf, "Outstanding Payments Report", startY);

    // Summary
    if (data.summary) {
        const overdueCount = data.outstanding_tasks?.filter(
            (task: any) => task.days_overdue > 0
        ).length ?? 0;

        const summaryData: [string, string][] = [
            ["Total Outstanding", formatCurrency(data.summary.total_outstanding)],
            ["Total Tasks", data.summary.task_count?.toString() || "0"],
            ["Average Balance", formatCurrency(data.summary.average_balance)],
            ["Overdue Tasks", overdueCount.toString()],
        ];

        yPosition = addSummaryTable(pdf, summaryData, yPosition, PDF_COLORS.financial.primary);
    }

    // PDF specific export with Top/Bottom 20
    if (data.pdf_data) {
        // Table 1: Highest Outstanding Balances
        yPosition = addSectionHeader(pdf, "Highest Outstanding Balances (Top 20)", yPosition);

        const top20Data = data.pdf_data.top_20.map((task: any) => [
            task.task_id,
            task.customer_name,
            task.customer_phone,
            formatCurrency(task.total_cost),
            formatCurrency(task.paid_amount),
            formatCurrency(task.outstanding_balance),
            task.workshop_status || '-',
        ]);

        autoTable(pdf, {
            head: [["Task ID", "Customer", "Phone", "Total Cost", "Paid Amount", "Outstanding", "Status"]],
            body: top20Data,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.danger },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 7 },
            pageBreak: "auto",
        });

        yPosition = getLastTableY(pdf, 15);

        // Table 2: Lowest Outstanding Balances
        yPosition = addSectionHeader(pdf, "Lowest Outstanding Balances (Last 20)", yPosition);

        const bottom20Data = data.pdf_data.bottom_20.map((task: any) => [
            task.task_id,
            task.customer_name,
            task.customer_phone,
            formatCurrency(task.total_cost),
            formatCurrency(task.paid_amount),
            formatCurrency(task.outstanding_balance),
            task.workshop_status || '-',
        ]);

        autoTable(pdf, {
            head: [["Task ID", "Customer", "Phone", "Total Cost", "Paid Amount", "Outstanding", "Status"]],
            body: bottom20Data,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.operational.primary }, // Use distinct color for contrast
            margin: { left: 20, right: 20 },
            styles: { fontSize: 7 },
            pageBreak: "auto",
        });

        return;
    }

    // Fallback / Standard Outstanding Tasks Table (e.g. if paginated view is passed directly)
    if (data.outstanding_tasks?.length > 0) {
        yPosition = addSectionHeader(pdf, "Outstanding Payments Details", yPosition);

        const tasksData = data.outstanding_tasks.map((task: any) => [
            task.task_id,
            task.customer_name,
            task.customer_phone,
            formatCurrency(task.outstanding_balance),
            task.status,
            task.workshop_status || '-',
        ]);

        autoTable(pdf, {
            head: [["Task ID", "Customer", "Phone", "Outstanding", "Status"]],
            body: tasksData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.danger },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 7 },
            pageBreak: "auto",
        });

        yPosition = getLastTableY(pdf, 10);

        // Critical overdue analysis
        const overdueTasks = data.outstanding_tasks.filter(
            (task: any) => task.days_overdue > 7
        );

        if (overdueTasks.length > 0) {
            pdf.setFontSize(12);
            pdf.setTextColor(...PDF_COLORS.danger);
            pdf.text("Critical Overdue Tasks (>7 days)", 20, yPosition);
            yPosition += 8;

            pdf.setFontSize(10);
            pdf.setTextColor(...PDF_COLORS.neutral);
            pdf.text(`${overdueTasks.length} tasks require immediate attention`, 20, yPosition);
        }
    }
};

/**
 * Generate Payment Methods PDF content
 */
export const generatePaymentMethodsPDF = (
    pdf: jsPDF,
    data: any,
    startY: number
): number => {
    let yPosition = addReportTitle(pdf, "Payment Methods Report", startY);

    // Summary
    const summary = data.summary || {};
    const summaryData: [string, string][] = [
        ["Total Revenue", formatCurrency(summary.total_revenue)],
        ["Total Expenditure", formatCurrency(summary.total_expenditure)],
        ["Net Revenue", formatCurrency(summary.net_revenue)],
        ["Total Payments", summary.total_payments?.toString() || "0"],
        ["Date Range", summary.date_range ? summary.date_range.replace(/_/g, " ") : "Last 30 Days"],
    ];

    yPosition = addSummaryTable(pdf, summaryData, yPosition, PDF_COLORS.operational.primary);

    // Revenue Methods
    if (data.revenue_methods?.length > 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(34, 139, 34); // Forest green
        pdf.text("Revenue Methods", 20, yPosition);
        yPosition += 10;

        const revenueData = data.revenue_methods.map((method: any) => [
            method.method_name?.replace(/-/g, " ") || "Unknown",
            formatCurrency(method.total_amount),
            method.payment_count?.toString() || "0",
            formatCurrency(method.average_payment),
            `${method.percentage || "0"}%`,
        ]);

        autoTable(pdf, {
            head: [["Payment Method", "Total Amount", "Payment Count", "Average Payment", "Percentage"]],
            body: revenueData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.success },
            margin: { left: 20, right: 20 },
        });

        yPosition = getLastTableY(pdf);
    }

    // Expenditure Methods
    if (data.expenditure_methods?.length > 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(220, 53, 69); // Bootstrap danger
        pdf.text("Expenditure Methods", 20, yPosition);
        yPosition += 10;

        const expenditureData = data.expenditure_methods.map((method: any) => [
            method.method_name?.replace(/-/g, " ") || "Unknown",
            formatCurrency(method.total_amount),
            method.payment_count?.toString() || "0",
            formatCurrency(method.average_payment),
            `${method.percentage || "0"}%`,
        ]);

        autoTable(pdf, {
            head: [["Payment Method", "Total Amount", "Payment Count", "Average Payment", "Percentage"]],
            body: expenditureData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.danger },
            margin: { left: 20, right: 20 },
        });

        yPosition = getLastTableY(pdf);
    }

    return yPosition;
};
