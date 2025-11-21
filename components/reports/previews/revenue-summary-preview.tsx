"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts"
import { Button } from "@/components/ui/core/button"
import { ChevronLeft, ChevronRight } from "lucide-react" // Import icons

const ChartContainer = ({ children, className }: any) => {
    return <div className={className}>{children}</div>
}

const ChartTooltip = (props: any) => {
    return <Tooltip {...props} />
}

interface RevenueSummaryReport {
    payments_by_date: {
        date: string
        daily_revenue: number
    }[]
    monthly_totals: {
        total_revenue: number
        total_refunds: number
        net_revenue: number
        average_payment: number
        payment_count: number
        refund_count: number
    }
    payment_methods: {
        method__name: string
        total: number
        count: number
    }[]
    date_range: string
    duration_info?: {
        days: number
        description: string
    }
    start_date?: string
    end_date?: string
    pagination?: {
        current_page: number
        page_size: number
        total_payments: number
        total_pages: number
        has_next: boolean
        has_previous: boolean
    }
}

interface RevenueSummaryPreviewProps {
    report: RevenueSummaryReport
    onPageChange?: (page: number, pageSize: number) => void
}

export const RevenueSummaryPreview = ({ report, onPageChange }: RevenueSummaryPreviewProps) => {
    // Use the actual data structure from your API response
    const monthlyTotals = report.monthly_totals || {}
    const paymentMethods = report.payment_methods || []
    const paymentsByDate = report.payments_by_date || []
    const dateRange = report.date_range || 'last_7_days'
    const durationInfo = report.duration_info || null
    const startDate = report.start_date
    const endDate = report.end_date
    const pagination = report.pagination

    // Format date range display
    const getDateRangeDisplay = () => {
        if (dateRange === 'custom' && startDate && endDate) {
            const start = new Date(startDate).toLocaleDateString()
            const end = new Date(endDate).toLocaleDateString()
            return `${start} - ${end}`
        }
        return dateRange.replace(/_/g, ' ')
    }

    // Helper function to format payment method names
    const formatPaymentMethodName = (name: string) => {
        if (!name) return 'Unknown'

        const formatted = name
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())

        // Handle specific cases
        if (formatted.toLowerCase().includes('t pesa')) {
            return 'T-Pesa'
        }
        if (formatted.toLowerCase().includes('tigopesa')) {
            return 'Tigo Pesa'
        }
        if (formatted.toLowerCase().includes('airtel')) {
            return 'Airtel Money'
        }
        if (formatted.toLowerCase().includes('mpesa')) {
            return 'M-Pesa'
        }

        return formatted
    }

    // Get color for payment method
    const getPaymentMethodColor = (name: string) => {
        const lowerName = name.toLowerCase()
        if (lowerName.includes('airtel')) return '#22c55e' // green
        if (lowerName.includes('mpesa')) return '#f59e0b' // orange
        if (lowerName.includes('tigo') || lowerName.includes('t pesa')) return '#3b82f6' // blue
        return '#6b7280' // gray
    }

    // Handle page change
    const handlePageChange = (newPage: number) => {
        console.log('Requested page change to:', newPage)
        if (onPageChange && pagination) {
            onPageChange(newPage, pagination.page_size)
        }
    }

    return (
        <div className="space-y-6">



            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-600">
                            TSh {monthlyTotals.total_revenue?.toLocaleString() || '0'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Payments</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {monthlyTotals.payment_count || '0'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Average Payment</p>
                        <p className="text-2xl font-bold text-blue-600">
                            TSh {monthlyTotals.average_payment?.toFixed(0)?.toLocaleString() || '0'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Date Range</p>
                        <p className="text-xl font-bold text-gray-900 capitalize">
                            {getDateRangeDisplay()}
                        </p>
                        {durationInfo && (
                            <p className="text-sm text-gray-500 mt-1">
                                {durationInfo.description}
                                {durationInfo.days > 0 && (
                                    <span className="ml-1">({durationInfo.days} days)</span>
                                )}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Daily Revenue Chart */}
            {paymentsByDate.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Revenue Trends</CardTitle>
                        {durationInfo && (
                            <p className="text-sm text-gray-500">
                                Showing {paymentsByDate.length} days of data over {durationInfo.description}
                                {pagination && (
                                    <span> (Page {pagination.current_page} of {pagination.total_pages})</span>
                                )}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent>
                        <ChartContainer className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={paymentsByDate}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                    />
                                    <YAxis />
                                    <ChartTooltip
                                        content={({ active, payload }: any) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload
                                                return (
                                                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                                                        <p className="font-medium">
                                                            {new Date(data.date).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-green-600 font-semibold">
                                                            TSh {data.daily_revenue?.toLocaleString() || '0'}
                                                        </p>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <Bar
                                        dataKey="daily_revenue"
                                        fill="#22c55e"
                                        radius={[4, 4, 0, 0]}
                                        name="Daily Revenue"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            )}

            {/* Payment Methods Breakdown */}
            {paymentMethods.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Methods Breakdown</CardTitle>
                        {durationInfo && (
                            <p className="text-sm text-gray-500">
                                Payment distribution over {durationInfo.description}
                                {pagination && (
                                    <span> (Page {pagination.current_page} of {pagination.total_pages})</span>
                                )}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6">
                            {/* Horizontal Bar Chart */}
                            <ChartContainer className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={paymentMethods}
                                        layout="vertical"
                                        margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" />
                                        <YAxis
                                            type="category"
                                            dataKey="method__name"
                                            tickFormatter={formatPaymentMethodName}
                                            width={80}
                                        />
                                        <ChartTooltip
                                            content={({ active, payload }: any) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload
                                                    const percentage = monthlyTotals.total_revenue
                                                        ? ((data.total / monthlyTotals.total_revenue) * 100).toFixed(1)
                                                        : '0'
                                                    return (
                                                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                                                            <p className="font-medium">
                                                                {formatPaymentMethodName(data.method__name)}
                                                            </p>
                                                            <p className="text-green-600 font-semibold">
                                                                TSh {data.total?.toLocaleString()}
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                {percentage}% of total
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                {data.count} payment{data.count !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <Bar
                                            dataKey="total"
                                            name="Revenue"
                                            radius={[0, 4, 4, 0]}
                                        >
                                            {paymentMethods.map((entry: any, index: number) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={getPaymentMethodColor(entry.method__name)}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>

                            {/* Payment Methods Details */}
                            <div className="space-y-4">
                                {paymentMethods.map((method: any) => {
                                    const percentage = monthlyTotals.total_revenue
                                        ? ((method.total / monthlyTotals.total_revenue) * 100).toFixed(1)
                                        : '0'
                                    return (
                                        <div key={method.method__name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{
                                                        backgroundColor: getPaymentMethodColor(method.method__name)
                                                    }}
                                                />
                                                <div>
                                                    <p className="font-medium">
                                                        {formatPaymentMethodName(method.method__name)}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {method.count} payment{method.count !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-green-600">
                                                    TSh {method.total?.toLocaleString()}
                                                </p>
                                                <p className="text-sm text-gray-500">{percentage}%</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Daily Revenue Table */}
            {paymentsByDate.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Revenue Details</CardTitle>
                        {durationInfo && (
                            <p className="text-sm text-gray-500">
                                {paymentsByDate.length} days of revenue data
                                {pagination && (
                                    <span> (Page {pagination.current_page} of {pagination.total_pages})</span>
                                )}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Daily Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paymentsByDate.map((day: any) => (
                                    <TableRow key={day.date}>
                                        <TableCell className="font-medium">
                                            {new Date(day.date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-green-600 font-semibold">
                                            TSh {day.daily_revenue?.toLocaleString() || '0'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Bottom Pagination Controls */}
            {pagination && pagination.total_pages > 1 && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.current_page - 1)}
                                    disabled={!pagination.has_previous}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.current_page + 1)}
                                    disabled={!pagination.has_next}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="text-sm text-gray-600">
                                Page {pagination.current_page} of {pagination.total_pages}
                            </div>
                            <div className="text-sm text-gray-600">
                                Total Payments: {pagination.total_payments}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}