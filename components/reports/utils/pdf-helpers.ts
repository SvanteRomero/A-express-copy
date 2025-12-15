import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_COLORS, PDFColor } from "./pdf-types";

/**
 * Initialize a new PDF document with autoTable plugin
 */
export const initializePDF = (): jsPDF => {
    const pdf = new jsPDF();
    (pdf as any).autoTable = autoTable;
    return pdf;
};

/**
 * Format a number as TSh currency
 */
export const formatCurrency = (amount: number | undefined | null): string => {
    return `TSh ${(amount ?? 0).toLocaleString()}`;
};

/**
 * Add a section header to the PDF
 */
export const addSectionHeader = (
    pdf: jsPDF,
    title: string,
    yPosition: number,
    color: PDFColor = [0, 0, 0]
): number => {
    pdf.setFontSize(12);
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(title, 20, yPosition);
    return yPosition + 10;
};

/**
 * Add a report title header
 */
export const addReportTitle = (
    pdf: jsPDF,
    title: string,
    yPosition: number
): number => {
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, 20, yPosition);
    return yPosition + 15;
};

/**
 * Add a summary table with key-value pairs
 */
export const addSummaryTable = (
    pdf: jsPDF,
    data: [string, string][],
    startY: number,
    headerColor: PDFColor = PDF_COLORS.neutral
): number => {
    autoTable(pdf, {
        head: [["Metric", "Value"]],
        body: data,
        startY,
        theme: "grid",
        headStyles: { fillColor: headerColor },
        margin: { left: 20, right: 20 },
    });

    return (pdf as any).lastAutoTable.finalY + 15;
};


/**
 * Add insight text with optional bullet points
 */
export const addInsightText = (
    pdf: jsPDF,
    text: string,
    yPosition: number,
    color: PDFColor = PDF_COLORS.neutral
): number => {
    pdf.setFontSize(9);
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(text, 20, yPosition);
    return yPosition + 5;
};

/**
 * Add a section label/header for analysis sections
 */
export const addAnalysisHeader = (
    pdf: jsPDF,
    title: string,
    yPosition: number,
    color: PDFColor = PDF_COLORS.success
): number => {
    pdf.setFontSize(11);
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(title, 20, yPosition);
    return yPosition + 8;
};

/**
 * Check if page break is needed and add new page if necessary
 */
export const checkPageBreak = (
    pdf: jsPDF,
    yPosition: number,
    threshold: number = 250
): number => {
    if (yPosition > threshold) {
        pdf.addPage();
        return 20;
    }
    return yPosition;
};

/**
 * Get the final Y position after the last auto table
 */
export const getLastTableY = (pdf: jsPDF, offset: number = 15): number => {
    return (pdf as any).lastAutoTable?.finalY + offset || 0;
};
