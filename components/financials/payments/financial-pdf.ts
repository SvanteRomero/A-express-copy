import { format } from "date-fns";

export interface PDFFinancialData {
    revenue: Array<{
        id: number;
        task: number;
        task_title: string;
        task_status: string;
        amount: string;
        date: string;
        method: number;
        method_name: string;
        description: string;
        category: number;
        category_name: string;
    }>;
    expenditures: Array<{
        id: number;
        task: number;
        task_title: string;
        task_status: string;
        amount: string;
        date: string;
        method: number;
        method_name: string;
        description: string;
        category: number;
        category_name: string;
    }>;
    total_revenue: string;
    total_expenditures: string;
    net_balance: string;
    period_start: string;
    period_end: string;
    opening_balance: string;
}

export const generateFinancialPDF = async (financialData: PDFFinancialData, startDate: Date, openingBalance?: number) => {
    try {
        // Import jsPDF normally
        const { jsPDF } = await import('jspdf');

        // Create the PDF document first
        const doc = new jsPDF();

        // Then import and apply autotable to the doc instance
        const autoTable = (await import('jspdf-autotable')).default;

        // Manually add autoTable to the doc instance
        (doc as any).autoTable = autoTable;

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let yPosition = 20;

        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('FINANCIAL SUMMARY REPORT', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;

        // Date range
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Period: ${format(startDate, 'MMM dd, yyyy')}`, margin, yPosition);
        yPosition += 15;

        // Summary section
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('FINANCIAL SUMMARY', margin, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        console.log(`opening balance: ${openingBalance}`);
        // Add Opening Balance from prop
        if (openingBalance !== undefined) {
            doc.text(`Opening Balance: TZS ${openingBalance.toLocaleString('en-US')}`, margin, yPosition);
            yPosition += 6;
        }

        doc.text(`Total Revenue: TZS ${Number.parseFloat(financialData.total_revenue).toLocaleString('en-US')}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Total Expenditures: TZS ${Number.parseFloat(financialData.total_expenditures).toLocaleString('en-US')}`, margin, yPosition);
        yPosition += 6;

        const netBalance = Number.parseFloat(financialData.net_balance);
        const balanceColor = netBalance >= 0 ? [0, 128, 0] : [255, 0, 0];
        doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
        doc.text(`Net Balance: TZS ${netBalance.toLocaleString('en-US')}`, margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 15;

        // --- Breakdown by Category ---
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('INCOME & EXPENDITURE BREAKDOWN', margin, yPosition);
        yPosition += 8;

        // Income breakdown by category
        const incomeByCategory: Record<string, number> = {};
        for (const item of financialData.revenue) {
            const cat = item.category_name || 'Uncategorized';
            incomeByCategory[cat] = (incomeByCategory[cat] || 0) + Number.parseFloat(item.amount);
        }
        const incomeBreakdownRows = Object.entries(incomeByCategory).map(([cat, total]) => [
            cat,
            total.toLocaleString('en-US'),
        ]);
        incomeBreakdownRows.push(['Total', Number.parseFloat(financialData.total_revenue).toLocaleString('en-US')]);

        // Expenditure breakdown by category
        const expByCategory: Record<string, number> = {};
        for (const item of financialData.expenditures) {
            const cat = item.category_name || 'Uncategorized';
            expByCategory[cat] = (expByCategory[cat] || 0) + Math.abs(Number.parseFloat(item.amount));
        }
        const expBreakdownRows = Object.entries(expByCategory).map(([cat, total]) => [
            cat,
            total.toLocaleString('en-US'),
        ]);
        expBreakdownRows.push(['Total', Number.parseFloat(financialData.total_expenditures).toLocaleString('en-US')]);

        const halfWidth = (pageWidth - margin * 2 - 10) / 2;

        // Income breakdown table (left half)
        autoTable(doc, {
            startY: yPosition,
            head: [['Income Category', 'Amount (TZS)']],
            body: incomeBreakdownRows,
            margin: { left: margin },
            tableWidth: halfWidth,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [66, 139, 202] },
            didParseCell: (data) => {
                if (data.row.index === incomeBreakdownRows.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                }
            },
        });

        // Expenditure breakdown table (right half, same startY)
        autoTable(doc, {
            startY: yPosition,
            head: [['Expenditure Category', 'Amount (TZS)']],
            body: expBreakdownRows,
            margin: { left: margin + halfWidth + 10, right: margin },
            tableWidth: halfWidth,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [220, 53, 69] },
            didParseCell: (data) => {
                if (data.row.index === expBreakdownRows.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                }
            },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;

        // Income/Revenue Table
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('INCOME TABLE', margin, yPosition);
        yPosition += 10;

        if (financialData.revenue.length > 0) {
            const revenueHeaders = ['Task', 'Description', 'Amount (TZS)', 'Method', 'Category', 'Date', 'Status'];
            const revenueData = financialData.revenue.map(item => [
                item.task_title || 'N/A',
                item.description || 'N/A',
                Number.parseFloat(item.amount).toLocaleString('en-US'),
                item.method_name || 'N/A',
                item.category_name || 'N/A',
                format(new Date(item.date), 'MMM dd, yyyy'),
                item.task_status || 'N/A'
            ]);

            // Use autoTable directly as a function
            autoTable(doc, {
                startY: yPosition,
                head: [revenueHeaders],
                body: revenueData,
                margin: { left: margin, right: margin },
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [66, 139, 202] }
            });

            yPosition = (doc as any).lastAutoTable.finalY + 10;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('No revenue data available', margin, yPosition);
            yPosition += 10;
        }

        // Add new page if needed
        if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
        }

        // Expenditures Table (without quantity column)
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('EXPENDITURES TABLE', margin, yPosition);
        yPosition += 10;

        if (financialData.expenditures.length > 0) {
            const expenditureHeaders = ['Task', 'Description', 'Amount (TZS)', 'Method', 'Category', 'Date', 'Status'];
            const expenditureData = financialData.expenditures.map(item => [
                item.task_title || 'N/A',
                item.description || 'N/A',
                Math.abs(Number.parseFloat(item.amount)).toLocaleString('en-US'),
                item.method_name || 'N/A',
                item.category_name || 'N/A',
                format(new Date(item.date), 'MMM dd, yyyy'),
                item.task_status || 'N/A'
            ]);

            autoTable(doc, {
                startY: yPosition,
                head: [expenditureHeaders],
                body: expenditureData,
                margin: { left: margin, right: margin },
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [220, 53, 69] }
            });
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('No expenditure data available', margin, yPosition);
        }

        // Footer
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(
                `Generated on ${format(new Date(), 'MMM dd, yyyy')} - Page ${i} of ${totalPages}`,
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }

        // Save the PDF
        const fileName = `financial_summary_${format(startDate, 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
};
