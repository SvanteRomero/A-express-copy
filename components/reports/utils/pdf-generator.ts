import jsPDF from "jspdf";
import { financialReports, operationalReports, SelectedReport, technicianReports } from "../report-data";
import { initializePDF } from "./pdf-helpers";
import { PDF_COLORS } from "./pdf-types";
import {
    generateOutstandingPaymentsPDF,
    generatePaymentMethodsPDF,
    generateTaskStatusPDF,
    generateTurnaroundTimePDF,
    generateInventoryLocationPDF,
    generateTechnicianPerformancePDF,
    generateTechnicianWorkloadPDF,
    generateFrontDeskPerformancePDF,
    generateGenericPDF,
} from "./generators";

// API endpoint mappings
const API_ENDPOINTS: Record<string, string> = {
    "outstanding-payments": "/reports/outstanding-payments/",
    "payment-methods": "/reports/payment-methods/",
    "task-status": "/reports/task-status/",
    "turnaround-time": "/reports/turnaround-time/",
    "workload": "/reports/technician-workload/",
    "performance": "/reports/technician-performance/",
    "inventory-location": "/reports/laptops-in-shop/",
    "front-desk-performance": "/reports/front-desk-performance/",
};

// Reports that need date range parameters
const DATE_RANGE_REPORTS = ["technician-performance", "payment-methods"];

/**
 * Add standard header to PDF
 */
const addHeader = (pdf: jsPDF, reportTitle: string, category: string): number => {
    // Brand
    pdf.setFontSize(20);
    pdf.setTextColor(...PDF_COLORS.primary);
    pdf.text("A+ Express", 20, 20);

    // Report title
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text(reportTitle, 20, 35);

    // Metadata
    pdf.setFontSize(10);
    pdf.setTextColor(...PDF_COLORS.neutral);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 45);
    pdf.text(`Report Category: ${category}`, 20, 52);
    pdf.text(`Date Range: Last 30 Days`, 20, 59);

    return 75; // Starting Y position for content
};

/**
 * Add footer to all pages
 */
const addFooter = (pdf: jsPDF): void => {
    const pageCount = pdf.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(...PDF_COLORS.neutral);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
        pdf.text("A+ Express - Confidential Report", 20, pageHeight - 10);
    }
};

/**
 * Route to appropriate generator based on report type
 */
const generateReportContent = (
    pdf: jsPDF,
    reportType: string,
    reportData: any,
    reportId: string,
    yPosition: number
): void => {
    switch (reportType) {
        case "task_status":
            generateTaskStatusPDF(pdf, reportData, yPosition);
            break;
        case "technician_performance":
            generateTechnicianPerformancePDF(pdf, reportData, yPosition);
            break;
        case "payment_methods":
            generatePaymentMethodsPDF(pdf, reportData, yPosition);
            break;
        case "technician_workload":
            generateTechnicianWorkloadPDF(pdf, reportData, yPosition);
            break;
        case "outstanding_payments":
            generateOutstandingPaymentsPDF(pdf, reportData, yPosition);
            break;
        case "turnaround_time":
            generateTurnaroundTimePDF(pdf, reportData, yPosition);
            break;
        case "inventory_location":
            generateInventoryLocationPDF(pdf, reportData, yPosition);
            break;
        case "front_desk_performance":
            generateFrontDeskPerformancePDF(pdf, reportData, yPosition);
            break;
        default:
            generateGenericPDF(pdf, reportData, reportId, yPosition);
    }
};

/**
 * Main PDF generation function
 */
export const generatePDF = async (
    reportId: string,
    selectedReport: SelectedReport | null,
    setIsGeneratingPDF: (id: string | null) => void
): Promise<void> => {
    setIsGeneratingPDF(reportId);

    try {
        let reportData = null;
        let reportType = "";

        // If we have the report data already from viewing, use it
        if (selectedReport && selectedReport.id === reportId) {
            reportData = selectedReport.data.report;
            reportType = selectedReport.data.type;
        } else {
            // Otherwise fetch the report data using apiClient
            const endpoint = API_ENDPOINTS[reportId];
            if (!endpoint) {
                console.warn(`No endpoint mapped for report: ${reportId}`);
                return;
            }

            const params: Record<string, string> = {};
            if (DATE_RANGE_REPORTS.includes(reportId)) {
                params.date_range = "last_30_days";
            }

            // Use apiClient with cookie auth
            const { apiClient } = await import("@/lib/api-client");
            const response = await apiClient.get(endpoint, { params });

            const data = response.data;
            reportData = data.report;
            reportType = data.type;
        }

        if (!reportData) {
            throw new Error("No report data available");
        }

        // Create new PDF document
        const pdf = initializePDF();

        // Find the report details for title and category
        const allReports = [...financialReports, ...operationalReports, ...technicianReports];
        const report = allReports.find((r) => r.id === reportId);

        // Add header
        const yPosition = addHeader(
            pdf,
            report?.title || reportId.replace(/-/g, " "),
            report?.category || "General"
        );

        // Generate report content
        generateReportContent(pdf, reportType, reportData, reportId, yPosition);

        // Add footer to all pages
        addFooter(pdf);

        // Save the PDF
        const fileName = `${(report?.title || reportId).replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
        pdf.save(fileName);

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Failed to generate PDF. Please try again.");
    } finally {
        setIsGeneratingPDF(null);
    }
};
