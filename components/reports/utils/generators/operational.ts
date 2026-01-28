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
 * Generate Task Execution PDF content
 */
export const generateTaskExecutionPDF = (
    pdf: jsPDF,
    data: any,
    startY: number
): void => {
    let yPosition = addReportTitle(pdf, "Task Execution Report", startY);

    // Summary
    const summary = data.summary || {};
    const taskDetails = data.task_details || [];

    const summaryData: [string, string][] = [
        ["Overall Avg Exec", summary.overall_average_hours !== undefined ? `${summary.overall_average_hours} hours` : "N/A"],
        ["Overall Avg Workshop", summary.overall_average_workshop_hours !== undefined ? `${summary.overall_average_workshop_hours} hours` : "N/A"],
        ["Tasks Analyzed", summary.total_tasks_analyzed ? `${summary.total_tasks_analyzed} tasks` : "0"],
        ["Tasks sent to Workshop", summary.total_tasks_workshop ? `${summary.total_tasks_workshop} tasks` : "0"],
        ["Best Period", summary.best_period || "N/A"],
        ["Fastest Task", summary.fastest_task_hours !== undefined ? `${summary.fastest_task_hours} hours` : "N/A"],
    ];

    yPosition = addSummaryTable(pdf, summaryData, yPosition, PDF_COLORS.info);
    yPosition += 5; // Extra spacing after summary

    // Top 5 Fastest Tasks
    const top5Fastest = summary.top_5_fastest || [];
    if (top5Fastest.length > 0) {
        yPosition = checkPageBreak(pdf, yPosition, 250);
        yPosition = addSectionHeader(pdf, "Top 5 Fastest Tasks", yPosition);

        const fastData = top5Fastest.map((task: any) => [
            task.task_title || task.title || "N/A",
            task.customer_name || "N/A",
            task.technicians || "Unassigned",
            task.execution_hours ? `${task.execution_hours}` : "0",
            task.workshop_hours ? `${task.workshop_hours}` : "0",
        ]);

        autoTable(pdf, {
            head: [["Task", "Customer", "Techs", "Exec(h)", "Work(h)"]],
            body: fastData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.success },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 8, cellPadding: 3 },
        });

        yPosition = getLastTableY(pdf, 20); // Increased spacing
    }

    // Top 5 Slowest Tasks
    const top5Slowest = summary.top_5_slowest || [];
    if (top5Slowest.length > 0) {
        yPosition = checkPageBreak(pdf, yPosition, 250);
        yPosition = addSectionHeader(pdf, "Top 5 Slowest Tasks", yPosition);

        const slowData = top5Slowest.map((task: any) => [
            task.task_title || task.title || "N/A",
            task.customer_name || "N/A",
            task.technicians || "Unassigned",
            task.execution_hours ? `${task.execution_hours}` : "0",
            task.workshop_hours ? `${task.workshop_hours}` : "0",
        ]);

        autoTable(pdf, {
            head: [["Task", "Customer", "Techs", "Exec(h)", "Work(h)"]],
            body: slowData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.danger },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 8, cellPadding: 3 },
        });

        yPosition = getLastTableY(pdf, 20); // Increased spacing
    }

    // Turnaround Time by Period
    if (data.periods?.length > 0) {
        yPosition = checkPageBreak(pdf, yPosition, 250);
        yPosition = addSectionHeader(pdf, "Task Execution by Period", yPosition);

        const turnaroundData = data.periods.map((period: any) => [
            period.period,
            period.average_execution_hours !== undefined ? `${period.average_execution_hours}h` : "N/A",
            period.average_workshop_hours !== undefined ? `${period.average_workshop_hours}h` : "0h",
            period.workshop_count?.toString() || "0",
            period.tasks_completed?.toString() || "0",
        ]);

        autoTable(pdf, {
            head: [["Period", "Avg Exec", "Avg Wrkshp", "Wrkshp Count", "Completed"]],
            body: turnaroundData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.success },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 8, cellPadding: 3 },
        });

        yPosition = getLastTableY(pdf, 20);
    }

    // Performance Analysis
    if (taskDetails.length > 0) {
        pdf.setFontSize(11);
        pdf.setTextColor(...PDF_COLORS.success);
        yPosition += 8;

        const executionHours = taskDetails.map((t: any) => t.execution_hours);
        // Thresholds in hours: 3 days = 72h, 7 days = 168h, 14 days = 336h
        const excellent = executionHours.filter((h: number) => h <= 72).length;
        const good = executionHours.filter((h: number) => h > 72 && h <= 168).length;
        const average = executionHours.filter((h: number) => h > 168 && h <= 336).length;
        const needsImprovement = executionHours.filter((h: number) => h > 336).length;

        // Efficiency rating
        const efficiencyScore = ((excellent * 1 + good * 0.8 + average * 0.6 + needsImprovement * 0.3) / executionHours.length) * 100;
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
