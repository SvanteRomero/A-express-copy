import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_COLORS } from "../pdf-types";
import {
    addReportTitle,
    addSectionHeader,
    addSummaryTable,
    formatCurrency,
    getLastTableY,
    checkPageBreak,
} from "../pdf-helpers";

/**
 * Generate Technician Performance PDF content
 */
export const generateTechnicianPerformancePDF = (
    pdf: jsPDF,
    data: any,
    startY: number
): void => {
    let yPosition = addReportTitle(pdf, "Technician Performance Report", startY);

    // Summary
    const technicianData = data.technician_performance || [];
    const summary = data.summary || {};
    const totalTechnicians = data.total_technicians || 0;
    const dateRange = data.date_range || "N/A";

    const summaryData: [string, string][] = [
        ["Total Technicians", totalTechnicians.toString()],
        ["Total Executed Tasks", summary.total_completed_tasks?.toString() || "0"],
        ["Current Active Tasks", summary.total_current_tasks?.toString() || "0"],
        ["Average Solve Rate", `${technicianData.length > 0 ? (technicianData.reduce((sum: number, t: any) => sum + (t.solve_rate || 0), 0) / technicianData.length).toFixed(1) : "0"}%`],
    ];

    yPosition = addSummaryTable(pdf, summaryData, yPosition, PDF_COLORS.technician.primary);

    // Technician Performance Overview
    if (technicianData.length > 0) {
        yPosition = addSectionHeader(pdf, "Technician Performance Overview", yPosition);

        const performanceTableData = technicianData.map((tech: any) => [
            tech.technician_name,
            `#${tech.rank || "-"}`,
            tech.completed_tasks_count?.toString() || "0",
            `${tech.solve_rate?.toFixed(1) || "0"}%`,
            tech.avg_completion_hours > 0 ? `${tech.avg_completion_hours.toFixed(1)}h` : "N/A",
            `${tech.workshop_rate?.toFixed(1) || "0"}%`,
            `${tech.percentage_of_tasks_involved?.toFixed(1) || "0"}%`,
        ]);

        autoTable(pdf, {
            head: [["Technician", "Rank", "Tasks", "Solve Rate", "Avg Time", "Workshop %", "Involvement %"]],
            body: performanceTableData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.technician.secondary },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 9, cellPadding: 3 },
            tableWidth: 'auto',
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 'auto' },
                4: { cellWidth: 'auto' },
                5: { cellWidth: 'auto' },
                6: { cellWidth: 'auto' },
            },
        });

        yPosition = getLastTableY(pdf);

        // Detailed Technician Breakdown
        pdf.setFontSize(12);
        pdf.text("Detailed Technician Breakdown", 20, yPosition);
        yPosition += 10;

        for (const tech of technicianData) {
            yPosition = checkPageBreak(pdf, yPosition, 250);

            // Technician Header
            pdf.setFontSize(11);
            pdf.setTextColor(0, 0, 0);
            pdf.text(`${tech.technician_name} - ${tech.technician_email}`, 20, yPosition);
            yPosition += 8;

            // Performance Metrics
            pdf.setFontSize(9);
            pdf.setTextColor(...PDF_COLORS.neutral);
            pdf.text("Key Performance Metrics:", 20, yPosition);
            yPosition += 7;

            // KPIs in a compact format
            const kpis = [
                `Solve Rate: ${tech.solve_rate?.toFixed(1) || "0"}% (${tech.solved_count || 0}/${tech.completed_tasks_count})`,
                `Tasks Executed: ${tech.completed_tasks_count}`,
                `Avg Time: ${tech.avg_completion_hours > 0 ? tech.avg_completion_hours.toFixed(1) + "h" : "N/A"}`,
                `Workshop Rate: ${tech.workshop_rate?.toFixed(1) || "0"}%`,
                `Task Involvement: ${tech.percentage_of_tasks_involved?.toFixed(1) || "0"}%`,
            ];

            let kpiX = 20;
            let kpiCount = 0;
            for (const kpi of kpis) {
                pdf.text(kpi, kpiX, yPosition);
                kpiCount++;
                if (kpiCount % 2 === 0) {
                    yPosition += 6;
                    kpiX = 20;
                } else {
                    kpiX = 110;
                }
            }
            if (kpis.length % 2 !== 0) yPosition += 6;
            yPosition += 5;

            // Peer Comparison
            if (tech.rank) {
                pdf.setTextColor(...PDF_COLORS.success);
                pdf.text("Peer Comparison:", 20, yPosition);
                yPosition += 7;
                pdf.setTextColor(...PDF_COLORS.neutral);
                pdf.text(`Overall Rank: #${tech.rank} of ${technicianData.length} (Top ${(100 - (tech.percentile || 0)).toFixed(0)}%)`, 20, yPosition);
                yPosition += 6;
                pdf.text(`Solve Rate Rank: #${tech.rank_by_solve_rate || "-"}  |  Speed Rank: #${tech.rank_by_avg_time || "N/A"}  |  Workshop Efficiency: #${tech.rank_by_workshop_rate || "-"}`, 20, yPosition);
                yPosition += 10;
            }

            // Current Workload
            pdf.setTextColor(...PDF_COLORS.neutral);
            pdf.text("Current Workload:", 20, yPosition);
            yPosition += 7;

            // Show current workload summary
            pdf.text(`In Progress: ${tech.in_progress_count || 0}  |  In Workshop: ${tech.in_workshop_count || 0}  |  Total Current: ${tech.current_assigned_tasks}`, 20, yPosition);
            yPosition += 10;

            // Recent Completed Tasks
            const completedTasks = tech.completed_tasks_detail || [];
            if (completedTasks.length > 0) {
                pdf.text("Recent Completed Tasks:", 20, yPosition);
                yPosition += 6;

                const recentTasks = completedTasks.slice(0, 3);
                for (const task of recentTasks) {
                    pdf.text(`• ${task.task_title}: ${task.completion_hours}h - ${formatCurrency(task.revenue)}`, 25, yPosition);
                    yPosition += 5;
                    yPosition = checkPageBreak(pdf, yPosition, 270);
                }
                yPosition += 3;
            }

            // Current Tasks by Status
            const tasksByStatus = tech.tasks_by_status || {};
            const currentStatuses = Object.keys(tasksByStatus).filter(
                (status) => !["Completed", "Picked Up", "Terminated"].includes(status)
            );

            if (currentStatuses.length > 0) {
                pdf.text("Current Tasks:", 20, yPosition);
                yPosition += 6;

                for (const status of currentStatuses) {
                    const tasks = tasksByStatus[status] || [];
                    if (tasks.length > 0) {
                        pdf.text(`${status} (${tasks.length}):`, 25, yPosition);
                        yPosition += 5;

                        const displayTasks = tasks.slice(0, 2);
                        for (const task of displayTasks) {
                            pdf.text(`  - ${task.task_title} (${task.customer_name})`, 30, yPosition);
                            yPosition += 4;
                            yPosition = checkPageBreak(pdf, yPosition, 270);
                        }

                        if (tasks.length > 2) {
                            pdf.text(`  ... and ${tasks.length - 2} more`, 30, yPosition);
                            yPosition += 4;
                        }

                        yPosition += 2;
                    }
                }
            }

            yPosition += 10; // Space between technicians
        }

        // Performance Analysis
        yPosition = checkPageBreak(pdf, yPosition, 200);

        pdf.setFontSize(11);
        pdf.setTextColor(...PDF_COLORS.success);
        pdf.text("Performance Analysis:", 20, yPosition);
        yPosition += 8;

        const topPerformer = technicianData.length > 0 ? technicianData[0] : null;
        const lowestWorkload = [...technicianData].sort((a, b) => a.current_assigned_tasks - b.current_assigned_tasks)[0];
        const highestCompletionRate = [...technicianData].sort((a, b) => b.completion_rate - a.completion_rate)[0];

        pdf.setFontSize(9);
        pdf.setTextColor(...PDF_COLORS.neutral);

        if (topPerformer) {
            pdf.text(`• Top Performer: ${topPerformer.technician_name} (${topPerformer.completed_tasks_count} tasks, ${formatCurrency(topPerformer.total_revenue_generated)})`, 20, yPosition);
            yPosition += 5;
        }

        if (highestCompletionRate) {
            pdf.text(`• Highest Completion Rate: ${highestCompletionRate.technician_name} (${highestCompletionRate.completion_rate?.toFixed(1)}%)`, 20, yPosition);
            yPosition += 5;
        }

        if (lowestWorkload) {
            pdf.text(`• Most Available: ${lowestWorkload.technician_name} (${lowestWorkload.current_assigned_tasks} current tasks)`, 20, yPosition);
            yPosition += 5;
        }

        // Workload Distribution
        const highWorkload = technicianData.filter((tech: any) => tech.workload_level === "High").length;
        const mediumWorkload = technicianData.filter((tech: any) => tech.workload_level === "Medium").length;
        const lowWorkload = technicianData.filter((tech: any) => tech.workload_level === "Low").length;

        pdf.text(`• Workload Distribution: High (${highWorkload}), Medium (${mediumWorkload}), Low (${lowWorkload})`, 20, yPosition);
        yPosition += 5;

        // Efficiency Notes
        pdf.setTextColor(...PDF_COLORS.warning);
        pdf.text("Efficiency Notes:", 20, yPosition);
        yPosition += 6;

        pdf.setFontSize(8);
        pdf.setTextColor(...PDF_COLORS.neutral);
        pdf.text("• Completion time under 24 hours is considered excellent", 20, yPosition);
        yPosition += 4;
        pdf.text("• Completion rate above 70% indicates good task management", 20, yPosition);
        yPosition += 4;
        pdf.text("• High workload may impact completion times and quality", 20, yPosition);
    }
};

/**
 * Generate Technician Workload PDF content
 */
export const generateTechnicianWorkloadPDF = (
    pdf: jsPDF,
    data: any,
    startY: number
): void => {
    let yPosition = addReportTitle(pdf, "Technician Workload Report", startY);

    const summary = data.summary || {};
    const technicians = data.technicians || data.technician_workload || [];
    const totalTasks = summary.total_tasks ?? data.total_tasks ?? 0;
    const avgPerTech = summary.avg_tasks_per_technician ?? (technicians.length ? Math.round(totalTasks / technicians.length) : 0);
    const dateRange = data.date_range || "Last 30 Days";

    const summaryData: [string, string][] = [
        ["Total Tasks", totalTasks.toString()],
        ["Technicians", technicians.length.toString()],
        ["Avg Tasks / Technician", avgPerTech.toString()],
        ["Date Range", dateRange.replace(/_/g, " ")],
    ];

    yPosition = addSummaryTable(pdf, summaryData, yPosition, PDF_COLORS.technician.primary);

    if (technicians.length > 0) {
        yPosition = addSectionHeader(pdf, "Workload by Technician", yPosition);

        const workloadData = technicians.map((tech: any) => [
            tech.technician_name || tech.name || "N/A",
            tech.assigned_tasks?.toString() || "0",
            tech.open_tasks?.toString() || "0",
            tech.overdue_tasks?.toString() || "0",
            tech.workload_level || "N/A",
        ]);

        autoTable(pdf, {
            head: [["Technician", "Assigned", "Open", "Overdue", "Workload"]],
            body: workloadData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.technician.secondary },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: "auto" },
                1: { cellWidth: "auto" },
                2: { cellWidth: "auto" },
                3: { cellWidth: "auto" },
                4: { cellWidth: "auto" },
            },
        });

        yPosition = getLastTableY(pdf, 10);

        // Quick insights
        const high = technicians.filter((t: any) => t.workload_level === "High").length;
        const medium = technicians.filter((t: any) => t.workload_level === "Medium").length;
        const low = technicians.filter((t: any) => t.workload_level === "Low").length;

        pdf.setFontSize(11);
        pdf.setTextColor(...PDF_COLORS.success);
        pdf.text("Workload Insights:", 20, yPosition);
        yPosition += 8;

        pdf.setFontSize(9);
        pdf.setTextColor(...PDF_COLORS.neutral);
        pdf.text(`• High: ${high}  • Medium: ${medium}  • Low: ${low}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`• Technicians analyzed: ${technicians.length}`, 20, yPosition);
    }
};

/**
 * Generate Front Desk Performance PDF content
 */
export const generateFrontDeskPerformancePDF = (
    pdf: jsPDF,
    data: any,
    startY: number
): void => {
    let yPosition = addReportTitle(pdf, "Front Desk Performance Report", startY);

    // Summary
    if (data.summary) {
        const summaryData: [string, string][] = [
            ["Total Tasks Approved", data.summary.total_approved?.toString() || "0"],
            ["Total Tasks Sent Out", data.summary.total_sent_out?.toString() || "0"],
            ["Start Date", data.summary.start_date],
            ["End Date", data.summary.end_date],
        ];

        yPosition = addSummaryTable(pdf, summaryData, yPosition, PDF_COLORS.financial.primary);
    }

    // Performance Data
    if (data.performance?.length > 0) {
        yPosition = addSectionHeader(pdf, "Detailed Performance Data", yPosition);

        const performanceData = data.performance.map((user: any) => [
            user.user_name,
            user.approved_count.toString(),
            `${user.approved_percentage.toFixed(2)}%`,
            user.sent_out_count.toString(),
            `${user.sent_out_percentage.toFixed(2)}%`,
        ]);

        autoTable(pdf, {
            head: [["User", "Tasks Approved", "% of Total Approved", "Tasks Sent Out", "% of Total Sent Out"]],
            body: performanceData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: PDF_COLORS.danger },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 7 },
            pageBreak: "auto",
        });
    }
};
