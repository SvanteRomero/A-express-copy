import type { jsPDF } from "jspdf";

// Type aliases
export type PDFColor = [number, number, number];

// Theme colors used across reports
export const PDF_COLORS = {
    // Brand
    primary: [220, 38, 38] as PDFColor,      // Red - A+ Express brand

    // Report category headers
    financial: {
        primary: [220, 38, 38] as PDFColor,   // Red
        secondary: [239, 68, 68] as PDFColor, // Light red
    },
    operational: {
        primary: [59, 130, 246] as PDFColor,  // Blue
        secondary: [139, 92, 246] as PDFColor, // Purple
    },
    technician: {
        primary: [14, 165, 233] as PDFColor,  // Sky blue
        secondary: [168, 85, 247] as PDFColor, // Violet
    },

    // Semantic colors
    success: [34, 197, 94] as PDFColor,       // Green
    warning: [245, 158, 11] as PDFColor,      // Amber
    danger: [239, 68, 68] as PDFColor,        // Red
    info: [14, 165, 233] as PDFColor,         // Sky
    neutral: [100, 100, 100] as PDFColor,     // Gray
    teal: [20, 184, 166] as PDFColor,         // Teal
} as const;

// AutoTable options interface
export interface AutoTableOptions {
    head?: string[][];
    body: (string | number)[][];
    startY: number;
    theme?: "grid" | "striped" | "plain";
    headStyles?: {
        fillColor?: PDFColor;
        textColor?: PDFColor;
        fontSize?: number;
    };
    margin?: {
        left?: number;
        right?: number;
        top?: number;
        bottom?: number;
    };
    styles?: {
        fontSize?: number;
        cellPadding?: number;
    };
    columnStyles?: Record<number, { cellWidth?: string | number }>;
    pageBreak?: "auto" | "avoid" | "always";
}

// PDF Generator function signature types
export type PDFGeneratorFunction = (
    pdf: jsPDF,
    data: any,
    startY: number
) => void;

export type GenericPDFGeneratorFunction = (
    pdf: jsPDF,
    data: any,
    reportId: string,
    startY: number
) => void;
