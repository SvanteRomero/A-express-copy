import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_COLORS } from "../pdf-types";
import {
    addReportTitle,
    addSectionHeader,
    addSummaryTable,
    getLastTableY,
    checkPageBreak,
} from "../pdf-helpers";

/**
 * Generate Task Status PDF content
 */
export const generateTaskStatusPDF = (
    pdf: jsPDF,
    data: any,
    startY: number
): void => {
    let yPosition = addReportTitle(pdf, "Task Status Report", startY);

    // Summary Statistics
    const statusDistribution = data.status_distribution || [];
    const urgencyDistribution = data.urgency_distribution || [];
    const totalTasks = data.total_tasks || 0;

    const completedTasks = statusDistribution.find((s: any) => s.status === "Completed")?.count || 0;
    const inProgressTasks = statusDistribution.find((s: any) => s.status === "In Progress")?.count || 0;

    const summaryData: [string, string][] = [
        ["Total Tasks", totalTasks.toString()],
        ["Completed Tasks", completedTasks.toString()],
        ["In Progress Tasks", inProgressTasks.toString()],
        ["Completion Rate", totalTasks > 0 ? `${((completedTasks / totalTasks) * 100).toFixed(1)}%` : "0%"],
    ];

    yPosition = addSummaryTable(pdf, summaryData, yPosition, PDF_COLORS.operational.secondary);

    // Status Distribution
    if (statusDistribution.length > 0) {
        yPosition = addSectionHeader(pdf, "Status Distribution", yPosition);

        const statusData = statusDistribution.map((status: any) => [
            status.status,
            status.count?.toString() || "0",
            `${status.percentage || "0"}%`,
        ]);

        autoTable(pdf, {
            head: [["Status", "Count", "Percentage"]],
            body: statusData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.operational.primary },
            margin: { left: 20, right: 20 },
        });

        yPosition = getLastTableY(pdf);
    }

    // Urgency Distribution
    if (urgencyDistribution.length > 0) {
        yPosition = addSectionHeader(pdf, "Urgency Distribution", yPosition);

        const urgencyData = urgencyDistribution.map((urgency: any) => [
            urgency.urgency,
            urgency.count?.toString() || "0",
            totalTasks > 0 ? `${((urgency.count / totalTasks) * 100).toFixed(1)}%` : "0%",
        ]);

        autoTable(pdf, {
            head: [["Urgency Level", "Count", "Percentage"]],
            body: urgencyData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.warning },
            margin: { left: 20, right: 20 },
        });
    }
};

/**
 * Generate Turnaround Time PDF content
 */
export const generateTurnaroundTimePDF = (
    pdf: jsPDF,
    data: any,
    startY: number
): void => {
    let yPosition = addReportTitle(pdf, "Turnaround Time Report", startY);

    // Summary
    const summary = data.summary || {};
    const taskDetails = data.task_details || [];

    const summaryData: [string, string][] = [
        ["Overall Average", summary.overall_average ? `${summary.overall_average} days` : "N/A"],
        ["Best Period", summary.best_period || "N/A"],
        ["Improvement", summary.improvement ? `${summary.improvement}%` : "N/A"],
        ["Tasks Analyzed", summary.total_tasks_analyzed ? `${summary.total_tasks_analyzed} tasks` : "0"],
        ["Fastest Task", taskDetails.length > 0 ? `${Math.min(...taskDetails.map((t: any) => t.turnaround_days)).toFixed(1)} days` : "N/A"],
        ["Slowest Task", taskDetails.length > 0 ? `${Math.max(...taskDetails.map((t: any) => t.turnaround_days)).toFixed(1)} days` : "N/A"],
    ];

    yPosition = addSummaryTable(pdf, summaryData, yPosition, PDF_COLORS.info);

    // Individual Task Details
    if (taskDetails.length > 0) {
        yPosition = addSectionHeader(pdf, "Individual Task Turnaround Times", yPosition);

        const taskData = taskDetails.map((task: any) => [
            task.title || "N/A",
            task.customer_name || "N/A",
            task.intake_date ? `${task.intake_date} ${task.intake_time}` : "N/A",
            task.pickup_date ? `${task.pickup_date} ${task.pickup_time}` : "N/A",
            task.assigned_technician || "Unassigned",
            task.turnaround_days ? `${task.turnaround_days} days` : "N/A",
        ]);

        autoTable(pdf, {
            head: [["Task", "Customer", "Intake", "Pickup", "Technician", "Turnaround"]],
            body: taskData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.technician.secondary },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: "auto" },
                1: { cellWidth: "auto" },
                2: { cellWidth: "auto" },
                3: { cellWidth: "auto" },
                4: { cellWidth: "auto" },
                5: { cellWidth: "auto" },
            },
        });

        yPosition = getLastTableY(pdf);
    }

    // Turnaround Time by Period
    if (data.periods?.length > 0) {
        yPosition = addSectionHeader(pdf, "Turnaround Time by Period", yPosition);

        const turnaroundData = data.periods.map((period: any) => [
            period.period,
            period.average_turnaround ? `${period.average_turnaround} days` : "N/A",
            period.tasks_completed?.toString() || "0",
        ]);

        autoTable(pdf, {
            head: [["Period", "Avg Turnaround", "Tasks Completed"]],
            body: turnaroundData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.success },
            margin: { left: 20, right: 20 },
        });

        yPosition = getLastTableY(pdf);
    }

    // Performance Analysis
    if (taskDetails.length > 0) {
        pdf.setFontSize(11);
        pdf.setTextColor(...PDF_COLORS.success);
        yPosition += 8;

        const turnaroundDays = taskDetails.map((t: any) => t.turnaround_days);
        const excellent = turnaroundDays.filter((d: number) => d <= 3).length;
        const good = turnaroundDays.filter((d: number) => d > 3 && d <= 7).length;
        const average = turnaroundDays.filter((d: number) => d > 7 && d <= 14).length;
        const needsImprovement = turnaroundDays.filter((d: number) => d > 14).length;

        // Efficiency rating
        const efficiencyScore = ((excellent * 1 + good * 0.8 + average * 0.6 + needsImprovement * 0.3) / turnaroundDays.length) * 100;
        pdf.setFontSize(10);
        const efficiencyColor = efficiencyScore >= 80 ? PDF_COLORS.success : efficiencyScore >= 60 ? PDF_COLORS.warning : PDF_COLORS.danger;
        pdf.setTextColor(...efficiencyColor);
        pdf.text(`Overall Efficiency Score: ${efficiencyScore.toFixed(1)}%`, 20, yPosition);
    }
};

/**
 * Generate Inventory Location PDF content
 */
export const generateInventoryLocationPDF = (
    pdf: jsPDF,
    data: any,
    startY: number
): void => {
    let yPosition = addReportTitle(pdf, "Inventory Location Report", startY);

    // Summary
    const summary = data.summary || {};
    const summaryData: [string, string][] = [
        ["Total Laptops", summary.total_laptops?.toString() || "0"],
        ["Total Capacity", summary.total_capacity?.toString() || "0"],
        ["Overall Utilization", `${summary.overall_utilization || "0"}%`],
        ["Available Capacity", summary.total_capacity && summary.total_laptops
            ? (summary.total_capacity - summary.total_laptops).toString()
            : "0"],
    ];

    autoTable(pdf, {
        head: [["Metric", "Value"]],
        body: summaryData,
        startY: yPosition,
        theme: "grid",
        headStyles: { fillColor: PDF_COLORS.teal },
        margin: { left: 20, right: 20 },
    });

    yPosition = getLastTableY(pdf);

    // Location Data
    if (data.locations?.length > 0) {
        yPosition = addSectionHeader(pdf, "Inventory by Location", yPosition);

        const locationData = data.locations.map((location: any) => [
            location.location,
            location.laptop_count?.toString() || "0",
            location.capacity?.toString() || "0",
            `${location.utilization || "0"}%`,
            location.utilization >= 90 ? "Full" : location.utilization >= 70 ? "Busy" : "Available",
        ]);

        autoTable(pdf, {
            head: [["Location", "Laptop Count", "Capacity", "Utilization", "Status"]],
            body: locationData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.warning },
            margin: { left: 20, right: 20 },
        });

        yPosition = getLastTableY(pdf, 10);

        // Capacity Analysis
        const fullLocations = data.locations.filter((loc: any) => loc.utilization >= 90).length;
        const availableLocations = data.locations.filter((loc: any) => loc.utilization < 70).length;

        pdf.setFontSize(11);
        pdf.setTextColor(...PDF_COLORS.operational.primary);
        pdf.text("Capacity Analysis:", 20, yPosition);
        yPosition += 8;

        pdf.setFontSize(9);
        pdf.setTextColor(...PDF_COLORS.neutral);
        pdf.text(`• Full Locations: ${fullLocations}`, 20, yPosition);
        yPosition += 5;
        pdf.text(`• Available Locations: ${availableLocations}`, 20, yPosition);
        yPosition += 5;
        pdf.text(`• Total Locations: ${data.locations.length}`, 20, yPosition);
    }
};
