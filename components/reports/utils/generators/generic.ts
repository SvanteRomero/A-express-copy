import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_COLORS } from "../pdf-types";
import { addReportTitle } from "../pdf-helpers";

/**
 * Generate Generic PDF content for unknown report types
 */
export const generateGenericPDF = (
    pdf: jsPDF,
    data: any,
    reportId: string,
    startY: number
): void => {
    let yPosition = addReportTitle(
        pdf,
        `${reportId.replace(/-/g, " ")} Report`,
        startY
    );

    // Convert data to table format for generic reports
    const flattenObject = (obj: any, prefix = ""): string[][] => {
        return Object.keys(obj).reduce((acc: string[][], key) => {
            const pre = prefix.length ? prefix + "." : "";
            if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
                return [...acc, ...flattenObject(obj[key], pre + key)];
            } else {
                return [...acc, [pre + key, obj[key]?.toString() || ""]];
            }
        }, []);
    };

    const tableData = flattenObject(data);

    if (tableData.length > 0) {
        autoTable(pdf, {
            head: [["Field", "Value"]],
            body: tableData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.neutral },
            margin: { left: 20, right: 20 },
        });
    } else {
        pdf.setFontSize(10);
        pdf.setTextColor(...PDF_COLORS.neutral);
        pdf.text("No data available for this report", 20, yPosition);
    }
};
