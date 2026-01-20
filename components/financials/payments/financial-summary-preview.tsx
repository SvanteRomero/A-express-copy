'use client'

import { useState, useEffect } from "react"
import { format, subDays } from "date-fns"
import { Download, X, FileText, Calendar as CalendarIcon, DollarSign, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs"
import { Badge } from "@/components/ui/core/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/layout/popover"
import { Calendar } from "@/components/ui/core/calendar"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import useSWR from 'swr'
import { apiClient } from "@/lib/api-client"

interface PDFFinancialData {
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

interface FinancialSummary {
    revenue: Array<{
        id: number
        task: number
        task_title: string
        task_status: string
        amount: string
        date: string
        method: number
        method_name: string
        description: string
        category: number
        category_name: string
    }>
    expenditures: Array<{
        id: number
        task: number
        task_title: string
        task_status: string
        amount: string
        date: string
        method: number
        method_name: string
        description: string
        category: number
        category_name: string
    }>
    total_revenue: string
    total_expenditures: string
    net_balance: string
    opening_balance: string;
    date: string
    period_start: string
    period_end: string
}

const fetcher = (url: string) => apiClient.get(url).then(res => res.data)

interface FinancialSummaryPreviewProps {
    isOpen: boolean
    onClose: () => void
    openingBalance?: number
}

export function FinancialSummaryPreview({ isOpen, onClose, openingBalance }: FinancialSummaryPreviewProps) {
    const [startDate, setStartDate] = useState<Date | undefined>(new Date())
    const [activeTab, setActiveTab] = useState('summary')
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)
    const isMobile = useIsMobile()

    const { data: financialData, error, isLoading, mutate } = useSWR<FinancialSummary>(
        isOpen && startDate
            ? `/financial-summary/?date=${format(startDate, 'yyyy-MM-dd')}`
            : null,
        fetcher,
        {
            revalidateOnFocus: false,
        }
    )

    useEffect(() => {
        if (isOpen && startDate) {
            mutate()
        }
    }, [startDate, isOpen, mutate])

    const handleDateSelect = (date: Date | undefined) => {
        setStartDate(date)
        setIsCalendarOpen(false)
    }

    const formatCurrency = (amount: number | string) => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS' }).format(numAmount)
    }

    const getNetBalanceVariant = (balance: string) => {
        const numBalance = parseFloat(balance)
        return numBalance >= 0 ? 'default' : 'destructive'
    }

    const generateFinancialPDF = async (financialData: PDFFinancialData, startDate: Date) => {
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

            doc.text(`Total Revenue: TZS ${parseFloat(financialData.total_revenue).toLocaleString('en-US')}`, margin, yPosition);
            yPosition += 6;
            doc.text(`Total Expenditures: TZS ${parseFloat(financialData.total_expenditures).toLocaleString('en-US')}`, margin, yPosition);
            yPosition += 6;

            const netBalance = parseFloat(financialData.net_balance);
            const balanceColor = netBalance >= 0 ? [0, 128, 0] : [255, 0, 0];
            doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
            doc.text(`Net Balance: TZS ${netBalance.toLocaleString('en-US')}`, margin, yPosition);
            doc.setTextColor(0, 0, 0);
            yPosition += 15;

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
                    parseFloat(item.amount).toLocaleString('en-US'),
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
                    Math.abs(parseFloat(item.amount)).toLocaleString('en-US'),
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
    const handleExport = () => {
        if (financialData && startDate) {
            generateFinancialPDF(financialData, startDate);
        }
    };

    if (error) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Financial Summary</DialogTitle>
                        <DialogDescription>
                            Preview and export financial reports
                        </DialogDescription>
                    </DialogHeader>
                    <div className="text-center py-8">
                        <p className="text-red-500">Failed to load financial data</p>
                        <Button onClick={() => mutate()} className="mt-4">
                            Retry
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={cn("max-h-[90vh] overflow-hidden flex flex-col", isMobile ? "max-w-[95vw] w-full" : "max-w-6xl")}>
                <DialogHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Financial Summary Report
                            </DialogTitle>
                            <DialogDescription>
                                Preview and export comprehensive financial reports
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Date Picker Controls */}
                <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between space-x-4'}`}>
                    <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center space-x-2'}`}>
                        <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Start Date:</span>
                        </div>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "justify-start text-left font-normal",
                                        !startDate && "text-muted-foreground",
                                        isMobile ? "w-full" : "w-[180px]"
                                    )}
                                >
                                    {startDate ? format(startDate, "MMM dd, yyyy") : <span>Select start date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={handleDateSelect}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button onClick={handleExport} disabled={isLoading || !startDate} className={isMobile ? "w-full" : ""}>
                        <Download className="h-4 w-4 mr-2" />
                        Export Report
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                            <p>Loading financial data...</p>
                        </div>
                    </div>
                ) : financialData ? (
                    <div className="flex-1 overflow-auto space-y-4">
                        {/* Summary Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">
                                        {formatCurrency(financialData.total_revenue)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {financialData.revenue.length} transactions
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Expenditures</CardTitle>
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-red-600">
                                        {formatCurrency(financialData.total_expenditures)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {financialData.expenditures.length} transactions
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                                    <DollarSign className="h-4 w-4 text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className={`text-2xl font-bold ${parseFloat(financialData.net_balance) >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {formatCurrency(financialData.net_balance)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Date: {format(new Date(financialData.period_start), 'MMM dd, yyyy')}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detailed Tables */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="summary">Summary</TabsTrigger>
                                <TabsTrigger value="revenue">Revenue ({financialData.revenue.length})</TabsTrigger>
                                <TabsTrigger value="expenditures">Expenditures ({financialData.expenditures.length})</TabsTrigger>
                            </TabsList>

                            <TabsContent value="summary" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Financial Overview</CardTitle>
                                        <CardDescription>
                                            Summary of revenue and expenditures for the selected date
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="font-medium">Date:</span>
                                                    <span className="ml-2">
                                                        {format(new Date(financialData.period_start), 'MMM dd, yyyy')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium">Total Transactions:</span>
                                                    <span className="ml-2">{financialData.revenue.length + financialData.expenditures.length}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium">Net Profit/Loss:</span>
                                                    <Badge
                                                        variant={getNetBalanceVariant(financialData.net_balance)}
                                                        className="ml-2"
                                                    >
                                                        {formatCurrency(financialData.net_balance)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="revenue">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Revenue Transactions</CardTitle>
                                        <CardDescription>
                                            All revenue transactions for the selected period
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {isMobile ? (
                                            <div className="space-y-4">
                                                {financialData.revenue.map((payment) => (
                                                    <Card key={payment.id} className="bg-green-50/50">
                                                        <CardHeader className="p-3 pb-1">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <div className="font-semibold text-sm">{payment.task_title}</div>
                                                                    <div className="text-xs text-muted-foreground">{payment.description}</div>
                                                                </div>
                                                                <div className="text-green-600 font-bold text-sm">
                                                                    {formatCurrency(payment.amount)}
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="p-3 pt-1 space-y-1">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <Badge variant="outline" className="text-xs">{payment.method_name}</Badge>
                                                                <span className="text-muted-foreground">{payment.category_name}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-muted-foreground">{format(new Date(payment.date), 'MMM dd, yyyy')}</span>
                                                                <Badge variant="secondary" className="text-xs">{payment.task_status}</Badge>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-md border">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Task</TableHead>
                                                            <TableHead>Description</TableHead>
                                                            <TableHead>Amount</TableHead>
                                                            <TableHead>Method</TableHead>
                                                            <TableHead>Category</TableHead>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Status</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {financialData.revenue.map((payment) => (
                                                            <TableRow key={payment.id}>
                                                                <TableCell className="font-medium">{payment.task_title}</TableCell>
                                                                <TableCell>{payment.description}</TableCell>
                                                                <TableCell className="text-green-600 font-medium">
                                                                    {formatCurrency(payment.amount)}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">{payment.method_name}</Badge>
                                                                </TableCell>
                                                                <TableCell>{payment.category_name}</TableCell>
                                                                <TableCell>{format(new Date(payment.date), 'MMM dd, yyyy')}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant="secondary">{payment.task_status}</Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="expenditures">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Expenditure Transactions</CardTitle>
                                        <CardDescription>
                                            All expenditure transactions for the selected period
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {isMobile ? (
                                            <div className="space-y-4">
                                                {financialData.expenditures.map((expenditure) => (
                                                    <Card key={expenditure.id} className="bg-red-50/50">
                                                        <CardHeader className="p-3 pb-1">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <div className="font-semibold text-sm">{expenditure.task_title || 'No Task'}</div>
                                                                    <div className="text-xs text-muted-foreground">{expenditure.description}</div>
                                                                </div>
                                                                <div className="text-red-600 font-bold text-sm">
                                                                    {formatCurrency(Math.abs(parseFloat(expenditure.amount)))}
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="p-3 pt-1 space-y-1">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <Badge variant="outline" className="text-xs">{expenditure.method_name}</Badge>
                                                                <span className="text-muted-foreground">{expenditure.category_name}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-muted-foreground">{format(new Date(expenditure.date), 'MMM dd, yyyy')}</span>
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {expenditure.task_status}
                                                                </Badge>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-md border">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Task</TableHead>
                                                            <TableHead>Description</TableHead>
                                                            <TableHead>Amount</TableHead>
                                                            <TableHead>Method</TableHead>
                                                            <TableHead>Category</TableHead>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Status</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {financialData.expenditures.map((expenditure) => (
                                                            <TableRow key={expenditure.id}>
                                                                <TableCell className="font-medium">{expenditure.task_title || 'N/A'}</TableCell>
                                                                <TableCell>{expenditure.description}</TableCell>
                                                                <TableCell className="text-red-600 font-medium">
                                                                    {formatCurrency(Math.abs(parseFloat(expenditure.amount)))}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">{expenditure.method_name}</Badge>
                                                                </TableCell>
                                                                <TableCell>{expenditure.category_name}</TableCell>
                                                                <TableCell>{format(new Date(expenditure.date), 'MMM dd, yyyy')}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant="secondary">{expenditure.task_status}</Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    )
}