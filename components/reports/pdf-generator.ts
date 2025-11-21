import jsPDF from "jspdf"
import autoTable from 'jspdf-autotable'
import { financialReports, operationalReports, SelectedReport, technicianReports } from "./report-data";

// Extend jsPDF types
declare module "jspdf" {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
        lastAutoTable?: {
            finalY: number;
        };
    }
}

const initializePDF = () => {
    const pdf = new jsPDF();
    (pdf as any).autoTable = autoTable;
    return pdf;
};

// Revenue Summary PDF
const generateRevenueSummaryPDF = (pdf: jsPDF, data: any, startY: number) => {
    let yPosition = startY

    pdf.setFontSize(14)
    pdf.setTextColor(0, 0, 0)
    pdf.text("Revenue Summary Report", 20, yPosition)
    yPosition += 15

    // Summary Statistics
    const monthlyTotals = data.monthly_totals || {}
    const paymentMethods = data.payment_methods || []
    const paymentsByDate = data.payments_by_date || []
    const dateRange = data.date_range || 'last_7_days'

    const summaryData = [
        ["Total Revenue", `TSh ${monthlyTotals.total_revenue?.toLocaleString() || '0'}`],
        ["Total Payments", monthlyTotals.payment_count?.toString() || "0"],
        ["Average Payment", `TSh ${monthlyTotals.average_payment?.toLocaleString() || '0'}`],
        ["Date Range", dateRange.replace(/_/g, ' ')]
    ]

    autoTable(pdf, {
        head: [["Metric", "Value"]],
        body: summaryData,
        startY: yPosition,
        theme: "grid",
        headStyles: { fillColor: [34, 197, 94] },
        margin: { left: 20, right: 20 },
    })

    yPosition = (pdf as any).lastAutoTable.finalY + 15

    // Daily Revenue Data
    if (paymentsByDate.length > 0) {
        pdf.setFontSize(12)
        pdf.text("Daily Revenue Breakdown", 20, yPosition)
        yPosition += 10

        const dailyData = paymentsByDate.map((day: any) => [
            new Date(day.date).toLocaleDateString(),
            `TSh ${day.daily_revenue?.toLocaleString() || '0'}`,
            day.payment_count?.toString() || "1"
        ])

        autoTable(pdf, {
            head: [["Date", "Daily Revenue", "Payments"]],
            body: dailyData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [59, 130, 246] },
            margin: { left: 20, right: 20 },
        })

        yPosition = (pdf as any).lastAutoTable.finalY + 15
    }

    // Payment Methods Breakdown
    if (paymentMethods.length > 0) {
        pdf.setFontSize(12)
        pdf.text("Payment Methods Breakdown", 20, yPosition)
        yPosition += 10

        const paymentMethodData = paymentMethods.map((method: any) => [
            method.method__name?.replace(/-/g, ' ') || 'Unknown',
            `TSh ${method.total?.toLocaleString() || '0'}`,
            method.count?.toString() || "0",
            monthlyTotals.total_revenue ? `${((method.total / monthlyTotals.total_revenue) * 100).toFixed(1)}%` : "0%"
        ])

        autoTable(pdf, {
            head: [["Payment Method", "Total Amount", "Payment Count", "Percentage"]],
            body: paymentMethodData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [168, 85, 247] },
            margin: { left: 20, right: 20 },
        })

        yPosition = (pdf as any).lastAutoTable.finalY + 10

        // Revenue Insights
        const topPaymentMethod = paymentMethods[0]
        const totalDays = paymentsByDate.length
        const averageDailyRevenue = monthlyTotals.total_revenue && totalDays > 0
            ? monthlyTotals.total_revenue / totalDays
            : 0

        pdf.setFontSize(11)
        pdf.setTextColor(59, 130, 246)
        pdf.text("Revenue Insights:", 20, yPosition)
        yPosition += 8

        pdf.setFontSize(9)
        pdf.setTextColor(80, 80, 80)

        if (topPaymentMethod) {
            pdf.text(`• Top Payment Method: ${topPaymentMethod.method__name?.replace(/-/g, ' ')} (TSh ${topPaymentMethod.total?.toLocaleString()})`, 20, yPosition)
            yPosition += 5
        }

        pdf.text(`• Period Covered: ${totalDays} day${totalDays !== 1 ? 's' : ''}`, 20, yPosition)
        yPosition += 5

        if (averageDailyRevenue > 0) {
            pdf.text(`• Average Daily Revenue: TSh ${averageDailyRevenue.toLocaleString()}`, 20, yPosition)
            yPosition += 5
        }

        pdf.text(`• Total Payment Methods: ${paymentMethods.length}`, 20, yPosition)
    } else {
        // No payment methods data
        pdf.setFontSize(10)
        pdf.setTextColor(100, 100, 100)
        pdf.text("No payment method data available for this period", 20, yPosition)
    }
}

// Outstanding Payments PDF
const generateOutstandingPaymentsPDF = (pdf: jsPDF, data: any, startY: number) => {
    let yPosition = startY

    pdf.setFontSize(14)
    pdf.setTextColor(0, 0, 0)
    pdf.text("Outstanding Payments Report", 20, yPosition)
    yPosition += 15

    // Summary
    if (data.summary) {
        const summaryData = [
            ["Total Outstanding", `TSh ${data.summary.total_outstanding?.toLocaleString() || '0'}`],
            ["Total Tasks", data.summary.task_count?.toString() || "0"],
            ["Average Balance", `TSh ${data.summary.average_balance?.toLocaleString() || '0'}`],
            ["Overdue Tasks", data.outstanding_tasks?.filter((task: any) => task.days_overdue > 0).length?.toString() || "0"]
        ]

        autoTable(pdf, {
            head: [["Metric", "Value"]],
            body: summaryData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [220, 38, 38] },
            margin: { left: 20, right: 20 },
        })

        yPosition = (pdf as any).lastAutoTable.finalY + 15
    }

    // Outstanding Tasks
    if (data.outstanding_tasks && data.outstanding_tasks.length > 0) {
        pdf.setFontSize(12)
        pdf.text("Outstanding Payments Details", 20, yPosition)
        yPosition += 10

        const tasksData = data.outstanding_tasks.map((task: any) => [
            task.task_id,
            task.customer_name,
            task.customer_phone,
            `TSh ${task.total_cost?.toLocaleString() || '0'}`,
            `TSh ${task.paid_amount?.toLocaleString() || '0'}`,
            `TSh ${task.outstanding_balance?.toLocaleString() || '0'}`,
            `${task.days_overdue} days`,
            task.status
        ])

        autoTable(pdf, {
            head: [["Task ID", "Customer", "Phone", "Total Cost", "Paid", "Outstanding", "Days Overdue", "Status"]],
            body: tasksData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [239, 68, 68] },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 7 },
            pageBreak: 'auto'
        })

        yPosition = (pdf as any).lastAutoTable.finalY + 10

        // Add overdue analysis
        const overdueTasks = data.outstanding_tasks.filter((task: any) => task.days_overdue > 7)
        if (overdueTasks.length > 0) {
            pdf.setFontSize(12)
            pdf.setTextColor(220, 38, 38)
            pdf.text("Critical Overdue Tasks (>7 days)", 20, yPosition)
            yPosition += 8

            pdf.setFontSize(10)
            pdf.setTextColor(100, 100, 100)
            pdf.text(`${overdueTasks.length} tasks require immediate attention`, 20, yPosition)
            yPosition += 10
        }
    }
}

// Payment Methods PDF
const generatePaymentMethodsPDF = (pdf: jsPDF, data: any, startY: number) => {
    let yPosition = startY

    pdf.setFontSize(14)
    pdf.setTextColor(0, 0, 0)
    pdf.text("Payment Methods Report", 20, yPosition)
    yPosition += 15

    // Summary
    const summary = data.summary || {}
    const summaryData = [
        ["Total Revenue", `TSh ${summary.total_revenue?.toLocaleString() || '0'}`],
        ["Total Expenditure", `TSh ${summary.total_expenditure?.toLocaleString() || '0'}`],
        ["Net Revenue", `TSh ${summary.net_revenue?.toLocaleString() || '0'}`],
        ["Total Payments", summary.total_payments?.toString() || "0"],
        ["Date Range", summary.date_range ? summary.date_range.replace(/_/g, ' ') : "Last 30 Days"]
    ]

    autoTable(pdf, {
        head: [["Metric", "Value"]],
        body: summaryData,
        startY: yPosition,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 },
    })

    yPosition = (pdf as any).lastAutoTable.finalY + 15

    // Revenue Methods
    if (data.revenue_methods && data.revenue_methods.length > 0) {
        pdf.setFontSize(12)
        pdf.setTextColor(34, 139, 34)
        pdf.text("Revenue Methods", 20, yPosition)
        yPosition += 10

        const revenueData = data.revenue_methods.map((method: any) => [
            method.method_name?.replace(/-/g, ' ') || 'Unknown',
            `TSh ${method.total_amount?.toLocaleString() || '0'}`,
            method.payment_count?.toString() || "0",
            `TSh ${method.average_payment?.toLocaleString() || '0'}`,
            `${method.percentage || '0'}%`
        ])

        autoTable(pdf, {
            head: [["Payment Method", "Total Amount", "Payment Count", "Average Payment", "Percentage"]],
            body: revenueData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [34, 197, 94] },
            margin: { left: 20, right: 20 },
        })

        yPosition = (pdf as any).lastAutoTable.finalY + 15
    }

    // Expenditure Methods
    if (data.expenditure_methods && data.expenditure_methods.length > 0) {
        pdf.setFontSize(12)
        pdf.setTextColor(220, 53, 69)
        pdf.text("Expenditure Methods", 20, yPosition)
        yPosition += 10

        const expenditureData = data.expenditure_methods.map((method: any) => [
            method.method_name?.replace(/-/g, ' ') || 'Unknown',
            `TSh ${method.total_amount?.toLocaleString() || '0'}`,
            method.payment_count?.toString() || "0",
            `TSh ${method.average_payment?.toLocaleString() || '0'}`,
            `${method.percentage || '0'}%`
        ])

        autoTable(pdf, {
            head: [["Payment Method", "Total Amount", "Payment Count", "Average Payment", "Percentage"]],
            body: expenditureData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [239, 68, 68] },
            margin: { left: 20, right: 20 },
        })

        yPosition = (pdf as any).lastAutoTable.finalY + 15
    }

    return yPosition
}

// Task Status PDF
const generateTaskStatusPDF = (pdf: jsPDF, data: any, startY: number) => {
    let yPosition = startY

    pdf.setFontSize(14)
    pdf.setTextColor(0, 0, 0)
    pdf.text("Task Status Report", 20, yPosition)
    yPosition += 15

    // Summary Statistics
    const statusDistribution = data.status_distribution || []
    const urgencyDistribution = data.urgency_distribution || []
    const totalTasks = data.total_tasks || 0

    const completedTasks = statusDistribution.find((s: any) => s.status === 'Completed')?.count || 0
    const inProgressTasks = statusDistribution.find((s: any) => s.status === 'In Progress')?.count || 0

    const summaryData = [
        ["Total Tasks", totalTasks.toString()],
        ["Completed Tasks", completedTasks.toString()],
        ["In Progress Tasks", inProgressTasks.toString()],
        ["Completion Rate", totalTasks > 0 ? `${((completedTasks / totalTasks) * 100).toFixed(1)}%` : "0%"]
    ]

    autoTable(pdf, {
        head: [["Metric", "Count"]],
        body: summaryData,
        startY: yPosition,
        theme: "grid",
        headStyles: { fillColor: [139, 92, 246] },
        margin: { left: 20, right: 20 },
    })

    yPosition = (pdf as any).lastAutoTable.finalY + 15

    // Status Distribution
    if (statusDistribution.length > 0) {
        pdf.setFontSize(12)
        pdf.text("Status Distribution", 20, yPosition)
        yPosition += 10

        const statusData = statusDistribution.map((status: any) => [
            status.status,
            status.count?.toString() || "0",
            `${status.percentage || '0'}%`
        ])

        autoTable(pdf, {
            head: [["Status", "Count", "Percentage"]],
            body: statusData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [59, 130, 246] },
            margin: { left: 20, right: 20 },
        })

        yPosition = (pdf as any).lastAutoTable.finalY + 15
    }

    // Urgency Distribution
    if (urgencyDistribution.length > 0) {
        pdf.setFontSize(12)
        pdf.text("Urgency Distribution", 20, yPosition)
        yPosition += 10

        const urgencyData = urgencyDistribution.map((urgency: any) => [
            urgency.urgency,
            urgency.count?.toString() || "0",
            totalTasks > 0 ? `${((urgency.count / totalTasks) * 100).toFixed(1)}%` : "0%"
        ])

        autoTable(pdf, {
            head: [["Urgency Level", "Count", "Percentage"]],
            body: urgencyData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [245, 158, 11] },
            margin: { left: 20, right: 20 },
        })
    }
}

// Turnaround Time PDF
const generateTurnaroundTimePDF = (pdf: jsPDF, data: any, startY: number) => {
    let yPosition = startY

    pdf.setFontSize(14)
    pdf.setTextColor(0, 0, 0)
    pdf.text("Turnaround Time Report", 20, yPosition)
    yPosition += 15

    // Summary
    const summary = data.summary || {}
    const summaryData = [
        ["Overall Average", summary.overall_average ? `${summary.overall_average} days` : "N/A"],
        ["Best Period", summary.best_period || "N/A"],
        ["Improvement", summary.improvement ? `${summary.improvement}%` : "N/A"],
        ["Tasks Analyzed", summary.total_tasks_analyzed ? `${summary.total_tasks_analyzed} tasks` : "0"],
        ["Fastest Task", data.task_details?.length > 0 ?
            `${Math.min(...data.task_details.map((t: any) => t.turnaround_days)).toFixed(1)} days` : "N/A"],
        ["Slowest Task", data.task_details?.length > 0 ?
            `${Math.max(...data.task_details.map((t: any) => t.turnaround_days)).toFixed(1)} days` : "N/A"]
    ]

    autoTable(pdf, {
        head: [["Metric", "Value"]],
        body: summaryData,
        startY: yPosition,
        theme: "grid",
        headStyles: { fillColor: [14, 165, 233] },
        margin: { left: 20, right: 20 },
    })

    yPosition = (pdf as any).lastAutoTable.finalY + 15

    // Individual Task Details
    if (data.task_details && data.task_details.length > 0) {
        pdf.setFontSize(12)
        pdf.setTextColor(0, 0, 0)
        pdf.text("Individual Task Turnaround Times", 20, yPosition)
        yPosition += 10

        const taskData = data.task_details.map((task: any) => [
            task.title || "N/A",
            task.customer_name || "N/A",
            task.intake_date ? `${task.intake_date} ${task.intake_time}` : "N/A",
            task.pickup_date ? `${task.pickup_date} ${task.pickup_time}` : "N/A",
            task.assigned_technician || "Unassigned",
            task.turnaround_days ? `${task.turnaround_days} days` : "N/A"
        ])

        autoTable(pdf, {
            head: [["Task", "Customer", "Intake", "Pickup", "Technician", "Turnaround"]],
            body: taskData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [168, 85, 247] },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 'auto' },
                4: { cellWidth: 'auto' },
                5: { cellWidth: 'auto' }
            }
        })

        yPosition = (pdf as any).lastAutoTable.finalY + 15
    }

    // Turnaround Time Data by Period
    if (data.periods && data.periods.length > 0) {
        pdf.setFontSize(12)
        pdf.setTextColor(0, 0, 0)
        pdf.text("Turnaround Time by Period", 20, yPosition)
        yPosition += 10

        const turnaroundData = data.periods.map((period: any) => [
            period.period,
            period.average_turnaround ? `${period.average_turnaround} days` : "N/A",
            period.tasks_completed?.toString() || "0"
        ])

        autoTable(pdf, {
            head: [["Period", "Avg Turnaround", "Tasks Completed"]],
            body: turnaroundData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [34, 197, 94] },
            margin: { left: 20, right: 20 },
        })

        yPosition = (pdf as any).lastAutoTable.finalY + 15
    }

    // Performance Analysis
    if (data.task_details && data.task_details.length > 0) {
        pdf.setFontSize(11)
        pdf.setTextColor(34, 197, 94)
        yPosition += 8

        const turnaroundDays = data.task_details.map((t: any) => t.turnaround_days)
        const avgTurnaround = turnaroundDays.reduce((a: number, b: number) => a + b, 0) / turnaroundDays.length
        const excellent = turnaroundDays.filter((d: number) => d <= 3).length
        const good = turnaroundDays.filter((d: number) => d > 3 && d <= 7).length
        const average = turnaroundDays.filter((d: number) => d > 7 && d <= 14).length
        const needsImprovement = turnaroundDays.filter((d: number) => d > 14).length

        // Efficiency rating
        const efficiencyScore = ((excellent * 1 + good * 0.8 + average * 0.6 + needsImprovement * 0.3) / turnaroundDays.length) * 100
        pdf.setFontSize(10)
        const efficiencyColor = efficiencyScore >= 80 ? [34, 197, 94] : (efficiencyScore >= 60 ? [234, 179, 8] : [239, 68, 68])
        pdf.setTextColor(efficiencyColor[0], efficiencyColor[1], efficiencyColor[2])
        pdf.text(`Overall Efficiency Score: ${efficiencyScore.toFixed(1)}%`, 20, yPosition)
    }
}

// Inventory Location PDF
const generateInventoryLocationPDF = (pdf: jsPDF, data: any, startY: number) => {
    let yPosition = startY

    pdf.setFontSize(14)
    pdf.setTextColor(0, 0, 0)
    pdf.text("Inventory Location Report", 20, yPosition)
    yPosition += 15

    // Summary
    const summary = data.summary || {}
    const summaryData = [
        ["Total Laptops", summary.total_laptops?.toString() || "0"],
        ["Total Capacity", summary.total_capacity?.toString() || "0"],
        ["Overall Utilization", `${summary.overall_utilization || '0'}%`],
        ["Available Capacity", summary.total_capacity && summary.total_laptops ?
            (summary.total_capacity - summary.total_laptops).toString() : "0"]
    ]

    pdf.autoTable({
        head: [["Metric", "Value"]],
        body: summaryData,
        startY: yPosition,
        theme: "grid",
        headStyles: { fillColor: [20, 184, 166] },
        margin: { left: 20, right: 20 },
    })

    yPosition = (pdf as any).lastAutoTable.finalY + 15

    // Location Data
    if (data.locations && data.locations.length > 0) {
        pdf.setFontSize(12)
        pdf.text("Inventory by Location", 20, yPosition)
        yPosition += 10

        const locationData = data.locations.map((location: any) => [
            location.location,
            location.laptop_count?.toString() || "0",
            location.capacity?.toString() || "0",
            `${location.utilization || '0'}%`,
            location.utilization >= 90 ? "Full" :
                location.utilization >= 70 ? "Busy" : "Available"
        ])

        pdf.autoTable({
            head: [["Location", "Laptop Count", "Capacity", "Utilization", "Status"]],
            body: locationData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [245, 158, 11] },
            margin: { left: 20, right: 20 },
        })

        yPosition = (pdf as any).lastAutoTable.finalY + 10

        // Capacity Analysis
        const fullLocations = data.locations.filter((loc: any) => loc.utilization >= 90).length
        const availableLocations = data.locations.filter((loc: any) => loc.utilization < 70).length

        pdf.setFontSize(11)
        pdf.setTextColor(59, 130, 246)
        pdf.text("Capacity Analysis:", 20, yPosition)
        yPosition += 8

        pdf.setFontSize(9)
        pdf.setTextColor(80, 80, 80)
        pdf.text(`• Full Locations: ${fullLocations}`, 20, yPosition)
        yPosition += 5
        pdf.text(`• Available Locations: ${availableLocations}`, 20, yPosition)
        yPosition += 5
        pdf.text(`• Total Locations: ${data.locations.length}`, 20, yPosition)
    }
}

// Technician Performance PDF
const generateTechnicianPerformancePDF = (pdf: jsPDF, data: any, startY: number) => {
    let yPosition = startY

    pdf.setFontSize(14)
    pdf.setTextColor(0, 0, 0)
    pdf.text("Technician Performance Report", 20, yPosition)
    yPosition += 15

    // Summary
    const technicianData = data.technician_performance || []
    const summary = data.summary || {}
    const totalTechnicians = data.total_technicians || 0
    const dateRange = data.date_range || 'N/A'

    const summaryData = [
        ["Total Technicians", totalTechnicians.toString()],
        ["Date Range", dateRange.replace(/_/g, ' ')],
        ["Total Completed Tasks", summary.total_completed_tasks?.toString() || "0"],
        ["Total Revenue Generated", `TSh ${summary.total_revenue?.toLocaleString() || '0'}`],
        ["Average Completion Time", `${summary.avg_completion_hours?.toFixed(1) || '0'} hours`],
        ["Current Active Tasks", summary.total_current_tasks?.toString() || "0"]
    ]

    autoTable(pdf, {
        head: [["Metric", "Value"]],
        body: summaryData,
        startY: yPosition,
        theme: "grid",
        headStyles: { fillColor: [14, 165, 233] },
        margin: { left: 20, right: 20 },
    })

    yPosition = (pdf as any).lastAutoTable.finalY + 15

    // Technician Performance Overview
    if (technicianData.length > 0) {
        pdf.setFontSize(12)
        pdf.setTextColor(0, 0, 0)
        pdf.text("Technician Performance Overview", 20, yPosition)
        yPosition += 10

        const performanceTableData = technicianData.map((tech: any) => [
            tech.technician_name,
            tech.completed_tasks_count?.toString() || "0",
            tech.current_assigned_tasks?.toString() || "0",
            `TSh ${tech.total_revenue_generated?.toLocaleString() || '0'}`,
            tech.avg_completion_hours > 0 ? `${tech.avg_completion_hours.toFixed(1)}h` : "N/A",
            `${tech.completion_rate?.toFixed(1) || '0'}%`,
            tech.workload_level || "N/A"
        ])

        autoTable(pdf, {
            head: [["Technician", "Completed", "Current", "Revenue", "Avg Time", "Completion Rate", "Workload"]],
            body: performanceTableData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [168, 85, 247] },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 'auto' },
                4: { cellWidth: 'auto' },
                5: { cellWidth: 'auto' },
                6: { cellWidth: 'auto' }
            }
        })

        yPosition = (pdf as any).lastAutoTable.finalY + 15

        // Detailed Technician Breakdown
        pdf.setFontSize(12)
        pdf.text("Detailed Technician Breakdown", 20, yPosition)
        yPosition += 10

        for (const tech of technicianData) {
            // Check if we need a new page
            if (yPosition > 250) {
                pdf.addPage()
                yPosition = 20
            }

            // Technician Header
            pdf.setFontSize(11)
            pdf.setTextColor(0, 0, 0)
            pdf.text(`${tech.technician_name} - ${tech.technician_email}`, 20, yPosition)
            yPosition += 8

            // Status Breakdown
            pdf.setFontSize(9)
            pdf.setTextColor(80, 80, 80)
            pdf.text("Task Status Breakdown:", 20, yPosition)
            yPosition += 6

            // Status counts in columns
            const statusCounts = tech.status_counts || {}
            let statusX = 20
            let statusCount = 0

            for (const [status, count] of Object.entries(statusCounts)) {
                pdf.text(`${status}: ${count}`, statusX, yPosition)
                statusCount++

                if (statusCount % 3 === 0) {
                    yPosition += 5
                    statusX = 20
                } else {
                    statusX += 60
                }
            }

            if (statusCount % 3 !== 0) {
                yPosition += 5
            }

            // Recent Completed Tasks
            const completedTasks = tech.completed_tasks_detail || []
            if (completedTasks.length > 0) {
                pdf.text("Recent Completed Tasks:", 20, yPosition)
                yPosition += 6

                const recentTasks = completedTasks.slice(0, 3)
                for (const task of recentTasks) {
                    pdf.text(`• ${task.task_title}: ${task.completion_hours}h - TSh ${task.revenue?.toLocaleString() || '0'}`, 25, yPosition)
                    yPosition += 5

                    if (yPosition > 270) {
                        pdf.addPage()
                        yPosition = 20
                    }
                }
                yPosition += 3
            }

            // Current Tasks by Status
            const tasksByStatus = tech.tasks_by_status || {}
            const currentStatuses = Object.keys(tasksByStatus).filter(status =>
                !['Completed', 'Picked Up', 'Terminated'].includes(status)
            )

            if (currentStatuses.length > 0) {
                pdf.text("Current Tasks:", 20, yPosition)
                yPosition += 6

                for (const status of currentStatuses) {
                    const tasks = tasksByStatus[status] || []
                    if (tasks.length > 0) {
                        pdf.text(`${status} (${tasks.length}):`, 25, yPosition)
                        yPosition += 5

                        // Show first 2 tasks per status
                        const displayTasks = tasks.slice(0, 2)
                        for (const task of displayTasks) {
                            pdf.text(`  - ${task.task_title} (${task.customer_name})`, 30, yPosition)
                            yPosition += 4

                            if (yPosition > 270) {
                                pdf.addPage()
                                yPosition = 20
                            }
                        }

                        if (tasks.length > 2) {
                            pdf.text(`  ... and ${tasks.length - 2} more`, 30, yPosition)
                            yPosition += 4
                        }

                        yPosition += 2
                    }
                }
            }

            yPosition += 10 // Space between technicians
        }

        // Performance Analysis
        if (yPosition > 200) {
            pdf.addPage()
            yPosition = 20
        }

        pdf.setFontSize(11)
        pdf.setTextColor(34, 197, 94)
        pdf.text("Performance Analysis:", 20, yPosition)
        yPosition += 8

        const topPerformer = technicianData.length > 0 ? technicianData[0] : null
        const lowestWorkload = [...technicianData].sort((a, b) => a.current_assigned_tasks - b.current_assigned_tasks)[0]
        const highestCompletionRate = [...technicianData].sort((a, b) => b.completion_rate - a.completion_rate)[0]

        pdf.setFontSize(9)
        pdf.setTextColor(80, 80, 80)

        if (topPerformer) {
            pdf.text(`• Top Performer: ${topPerformer.technician_name} (${topPerformer.completed_tasks_count} tasks, TSh ${topPerformer.total_revenue_generated?.toLocaleString()})`, 20, yPosition)
            yPosition += 5
        }

        if (highestCompletionRate) {
            pdf.text(`• Highest Completion Rate: ${highestCompletionRate.technician_name} (${highestCompletionRate.completion_rate?.toFixed(1)}%)`, 20, yPosition)
            yPosition += 5
        }

        if (lowestWorkload) {
            pdf.text(`• Most Available: ${lowestWorkload.technician_name} (${lowestWorkload.current_assigned_tasks} current tasks)`, 20, yPosition)
            yPosition += 5
        }

        // Workload Distribution
        const highWorkload = technicianData.filter((tech: any) => tech.workload_level === 'High').length
        const mediumWorkload = technicianData.filter((tech: any) => tech.workload_level === 'Medium').length
        const lowWorkload = technicianData.filter((tech: any) => tech.workload_level === 'Low').length

        pdf.text(`• Workload Distribution: High (${highWorkload}), Medium (${mediumWorkload}), Low (${lowWorkload})`, 20, yPosition)
        yPosition += 5

        // Efficiency Notes
        pdf.setTextColor(234, 179, 8)
        pdf.text("Efficiency Notes:", 20, yPosition)
        yPosition += 6

        pdf.setFontSize(8)
        pdf.setTextColor(80, 80, 80)
        pdf.text("• Completion time under 24 hours is considered excellent", 20, yPosition)
        yPosition += 4
        pdf.text("• Completion rate above 70% indicates good task management", 20, yPosition)
        yPosition += 4
        pdf.text("• High workload may impact completion times and quality", 20, yPosition)
    }
}

// Technician Workload PDF
const generateTechnicianWorkloadPDF = (pdf: jsPDF, data: any, startY: number) => {
    let yPosition = startY

    pdf.setFontSize(14)
    pdf.setTextColor(0, 0, 0)
    pdf.text("Technician Workload Report", 20, yPosition)
    yPosition += 15

    const summary = data.summary || {}
    const technicians = data.technicians || data.technician_workload || []
    const totalTasks = summary.total_tasks ?? data.total_tasks ?? 0
    const avgPerTech = summary.avg_tasks_per_technician ?? (technicians.length ? Math.round(totalTasks / technicians.length) : 0)
    const dateRange = data.date_range || 'Last 30 Days'

    const summaryData = [
        ["Total Tasks", totalTasks.toString()],
        ["Technicians", technicians.length.toString()],
        ["Avg Tasks / Technician", avgPerTech.toString()],
        ["Date Range", dateRange.replace(/_/g, ' ')]
    ]

    autoTable(pdf, {
        head: [["Metric", "Value"]],
        body: summaryData,
        startY: yPosition,
        theme: "grid",
        headStyles: { fillColor: [14, 165, 233] },
        margin: { left: 20, right: 20 },
    })

    yPosition = (pdf as any).lastAutoTable.finalY + 15

    if (technicians && technicians.length > 0) {
        pdf.setFontSize(12)
        pdf.setTextColor(0, 0, 0)
        pdf.text("Workload by Technician", 20, yPosition)
        yPosition += 10

        const workloadData = technicians.map((tech: any) => [
            tech.technician_name || tech.name || "N/A",
            tech.assigned_tasks?.toString() || "0",
            tech.open_tasks?.toString() || "0",
            tech.overdue_tasks?.toString() || "0",
            tech.workload_level || "N/A",
        ])

        autoTable(pdf, {
            head: [["Technician", "Assigned", "Open", "Overdue", "Workload"]],
            body: workloadData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [168, 85, 247] },
            margin: { left: 20, right: 20 },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 'auto' },
                4: { cellWidth: 'auto' },
            }
        })

        yPosition = (pdf as any).lastAutoTable.finalY + 10

        // Quick insights
        const high = technicians.filter((t: any) => t.workload_level === 'High').length
        const medium = technicians.filter((t: any) => t.workload_level === 'Medium').length
        const low = technicians.filter((t: any) => t.workload_level === 'Low').length

        pdf.setFontSize(11)
        pdf.setTextColor(34, 197, 94)
        pdf.text("Workload Insights:", 20, yPosition)
        yPosition += 8

        pdf.setFontSize(9)
        pdf.setTextColor(80, 80, 80)
        pdf.text(`• High: ${high}  • Medium: ${medium}  • Low: ${low}`, 20, yPosition)
        yPosition += 6
        pdf.text(`• Technicians analyzed: ${technicians.length}`, 20, yPosition)
    }
}

// Generic PDF for unknown report types
const generateGenericPDF = (pdf: jsPDF, data: any, reportId: string, startY: number) => {
    let yPosition = startY

    pdf.setFontSize(14)
    pdf.setTextColor(0, 0, 0)
    pdf.text(`${reportId.replace(/-/g, ' ')} Report`, 20, yPosition)
    yPosition += 15

    // Convert data to table format for generic reports
    const flattenObject = (obj: any, prefix = ''): string[][] => {
        return Object.keys(obj).reduce((acc: string[][], key) => {
            const pre = prefix.length ? prefix + '.' : ''
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                return [...acc, ...flattenObject(obj[key], pre + key)]
            } else {
                return [...acc, [pre + key, obj[key]?.toString() || '']]
            }
        }, [])
    }

    const tableData = flattenObject(data)

    if (tableData.length > 0) {
        pdf.autoTable({
            head: [["Field", "Value"]],
            body: tableData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [100, 100, 100] },
            margin: { left: 20, right: 20 },
        })
    } else {
        pdf.setFontSize(10)
        pdf.setTextColor(100, 100, 100)
        pdf.text("No data available for this report", 20, yPosition)
    }
}

// Main PDF generation function
export const generatePDF = async (
    reportId: string,
    selectedReport: SelectedReport | null,
    setIsGeneratingPDF: (id: string | null) => void
) => {
    setIsGeneratingPDF(reportId)

    try {
        // Get the actual report data from the selected report or fetch it
        let reportData = null
        let reportType = ''

        // If we have the report data already from viewing, use it
        if (selectedReport && selectedReport.id === reportId) {
            reportData = selectedReport.data.report
            reportType = selectedReport.data.type
        } else {
            // Otherwise fetch the report data
            const apiEndpoints: { [key: string]: string } = {
                'revenue-summary': '/api/reports/revenue-summary/',
                'outstanding-payments': '/api/reports/outstanding-payments/',
                'payment-methods': '/api/reports/payment-methods/',
                'task-status': '/api/reports/task-status/',
                'turnaround-time': '/api/reports/turnaround-time/',
                'workload': '/api/reports/technician-workload/',
                'performance': '/api/reports/technician-performance/',
                'inventory-location': '/api/reports/laptops-in-shop/'
            }

            const endpoint = apiEndpoints[reportId]
            if (!endpoint) {
                console.warn(`No endpoint mapped for report: ${reportId}`)
                return
            }

            let url = `http://localhost:8000${endpoint}`
            const dateRangeReports = ['revenue-summary', 'technician-performance', 'payment-methods']
            if (dateRangeReports.includes(reportId)) {
                const params = new URLSearchParams({ date_range: 'last_30_days' })
                url += `?${params.toString()}`
            }

            let token: string | null = null
            const authTokens = localStorage.getItem('auth_tokens')
            if (authTokens) {
                try {
                    const parsedTokens = JSON.parse(authTokens)
                    token = parsedTokens?.access ?? null
                } catch (e) {
                    console.warn('Failed to parse auth_tokens from localStorage', e)
                }
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            }
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const response = await fetch(url, { method: 'GET', headers })
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

            const data = await response.json()
            reportData = data.report
            reportType = data.type
        }

        if (!reportData) {
            throw new Error('No report data available')
        }

        // Create new PDF document
        const pdf = initializePDF()

        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()

        // Add header
        pdf.setFontSize(20)
        pdf.setTextColor(220, 38, 38)
        pdf.text("A+ Express", 20, 20)

        // Find the report details for title and category
        const allReports = [...financialReports, ...operationalReports, ...technicianReports]
        const report = allReports.find((r) => r.id === reportId)

        pdf.setFontSize(16)
        pdf.setTextColor(0, 0, 0)
        pdf.text(report?.title || reportId.replace(/-/g, ' '), 20, 35)

        pdf.setFontSize(10)
        pdf.setTextColor(100, 100, 100)
        pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 45)
        pdf.text(`Report Category: ${report?.category || 'General'}`, 20, 52)
        pdf.text(`Date Range: Last 30 Days`, 20, 59)

        let yPosition = 75

        // Generate PDF content based on report type and actual data
        switch (reportType) {
            case 'task_status':
                generateTaskStatusPDF(pdf, reportData, yPosition)
                break
            case 'technician_performance':
                generateTechnicianPerformancePDF(pdf, reportData, yPosition)
                break
            case 'payment_methods':
                generatePaymentMethodsPDF(pdf, reportData, yPosition)
                break
            case 'technician_workload':
                generateTechnicianWorkloadPDF(pdf, reportData, yPosition)
                break
            case 'outstanding_payments':
                generateOutstandingPaymentsPDF(pdf, reportData, yPosition)
                break
            case 'revenue_summary':
                generateRevenueSummaryPDF(pdf, reportData, yPosition)
                break
            case 'turnaround_time':
                generateTurnaroundTimePDF(pdf, reportData, yPosition)
                break
            case 'inventory_location':
                generateInventoryLocationPDF(pdf, reportData, yPosition)
                break
            default:
                generateGenericPDF(pdf, reportData, reportId, yPosition)
        }

        // Add footer to all pages
        const pageCount = pdf.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i)
            pdf.setFontSize(8)
            pdf.setTextColor(100, 100, 100)
            pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10)
            pdf.text("A+ Express - Confidential Report", 20, pageHeight - 10)
        }

        // Save the PDF
        const fileName = `${(report?.title || reportId).replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
        pdf.save(fileName)

    } catch (error) {
        console.error("Error generating PDF:", error)
        alert('Failed to generate PDF. Please try again.')
    } finally {
        setIsGeneratingPDF(null)
    }
}