import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_COLORS } from "../pdf-types";

interface PrintTask {
    task_title: string;
    customer_name: string;
    brand: string;
    laptop_model: string;
    location: string;
    status: string;
    workshop_status: string;
    technician: string;
    urgency: string;
    is_debt: boolean;
}

interface PrintTasksData {
    tasks: PrintTask[];
    summary: {
        total_tasks: number;
        start_date: string;
        end_date: string;
        duration_days: number;
        duration_description: string;
    };
}

/**
 * Format a date string into a readable format
 */
const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

/**
 * Generate a landscape PDF listing all tasks in the given data.
 */
export const generatePrintTasksPDF = (data: PrintTasksData): void => {
    const pdf = new jsPDF({ orientation: "landscape" });
    (pdf as any).autoTable = autoTable;

    const pageWidth = pdf.internal.pageSize.getWidth();

    // === Header ===
    pdf.setFontSize(20);
    pdf.setTextColor(...PDF_COLORS.primary);
    pdf.text("A+ Express", 20, 20);

    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Tasks Report", 20, 32);

    pdf.setFontSize(10);
    pdf.setTextColor(...PDF_COLORS.neutral);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 42);

    const dateRange = `${formatDate(data.summary.start_date)} – ${formatDate(data.summary.end_date)}`;
    pdf.text(`Date Range: ${dateRange}`, 20, 49);
    pdf.text(`Total Tasks: ${data.summary.total_tasks}`, 20, 56);

    // === Table ===
    const startY = 66;

    if (data.tasks.length === 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text("No tasks found for the selected date range.", pageWidth / 2, startY + 20, {
            align: "center",
        });
    } else {
        const head = [
            [
                "Task Title",
                "Customer",
                "Device",
                "Location",
                "Task Status",
                "Device Status",
                "Technician",
                "Urgency",
                "In Debt",
            ],
        ];

        const body = data.tasks.map((t) => [
            t.task_title,
            t.customer_name,
            `${t.brand} ${t.laptop_model}`.trim(),
            t.location,
            t.status,
            t.workshop_status,
            t.technician,
            t.urgency,
            t.is_debt ? "Yes" : "No",
        ]);

        autoTable(pdf, {
            head,
            body,
            startY,
            theme: "grid",
            headStyles: {
                fillColor: PDF_COLORS.primary,
                fontSize: 8,
                cellPadding: 3,
            },
            styles: {
                fontSize: 7.5,
                cellPadding: 2.5,
            },
            columnStyles: {
                0: { cellWidth: 22 },  // Task ID
                1: { cellWidth: 38 },  // Customer
                2: { cellWidth: 42 },  // Device
                3: { cellWidth: 30 },  // Location
                4: { cellWidth: 30 },  // Task Status
                5: { cellWidth: 30 },  // Device Status
                6: { cellWidth: 35 },  // Technician
                7: { cellWidth: 28 },  // Urgency
                8: { cellWidth: 20 },  // In Debt
            },
            margin: { left: 10, right: 10 },
        });
    }

    // === Footer on all pages ===
    const pageCount = pdf.getNumberOfPages();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(...PDF_COLORS.neutral);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
        pdf.text("A+ Express – Confidential Report", 10, pageHeight - 10);
    }

    // === Save ===
    const fileName = `Tasks_Report_${new Date().toISOString().split("T")[0]}.pdf`;
    pdf.save(fileName);
};
