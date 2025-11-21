"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Badge } from "@/components/ui/core/badge"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

const ChartContainer = ({ children, className }: any) => {
    return <div className={className}>{children}</div>
}

const ChartTooltip = (props: any) => {
    return <Tooltip {...props} />
}

interface PaymentMethodsReport {
    revenue_methods: {
        method_name: string
        total_amount: number
        payment_count: number
        average_payment: number
        percentage: number
    }[]
    expenditure_methods: {
        method_name: string
        total_amount: number
        payment_count: number
        average_payment: number
        percentage: number
    }[]
    summary: {
        total_revenue: number
        total_expenditure: number
        net_revenue: number
        total_payments: number
    }
    date_range: string
    duration_info?: {
        days: number
        description: string
    }
    start_date?: string
    end_date?: string
}

export const PaymentMethodsPreview = ({ report }: { report: any }) => {
    const revenueMethods = report.revenue_methods || []
    const expenditureMethods = report.expenditure_methods || []
    const summary = report.summary || {}
    const totalRevenue = summary.total_revenue || 0
    const totalExpenditure = summary.total_expenditure || 0
    const netRevenue = summary.net_revenue || 0
    const totalPayments = summary.total_payments || 0
    const dateRange = report.date_range || 'last_30_days'
    const durationInfo = report.duration_info || null
    const startDate = report.start_date
    const endDate = report.end_date

    // Format date range display
    const getDateRangeDisplay = () => {
        if (dateRange === 'custom' && startDate && endDate) {
            const start = new Date(startDate).toLocaleDateString()
            const end = new Date(endDate).toLocaleDateString()
            return `${start} - ${end}`
        }
        return dateRange.replace(/_/g, ' ')
    }

    // Prepare data for bar chart - show top 5 methods by absolute value
    const topMethods = [
        ...revenueMethods.map((m: PaymentMethodsReport['revenue_methods'][0]) => ({ ...m, type: 'revenue', abs_amount: Math.abs(m.total_amount) })),
        ...expenditureMethods.map((m: PaymentMethodsReport['expenditure_methods'][0]) => ({ ...m, type: 'expenditure', abs_amount: Math.abs(m.total_amount) }))
    ]
        .sort((a, b) => b.abs_amount - a.abs_amount)
        .slice(0, 6)

    const allMethods = [...revenueMethods, ...expenditureMethods]

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Payment Methods Report</h1>
                            <p className="text-gray-600 mt-1">Live data from your backend API</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <Badge variant="secondary" className="bg-white text-blue-700 border-blue-200">
                                {getDateRangeDisplay()}
                            </Badge>
                            {durationInfo && (
                                <p className="text-sm text-gray-600">
                                    {durationInfo.description}
                                    {durationInfo.days > 0 && (
                                        <span className="ml-1">({durationInfo.days} days)</span>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                    <p className="text-gray-700 mt-3">
                        Analyze payments by cash, card, and digital methods. Track revenue and expenditure across different payment channels.
                    </p>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-600">
                            TSh {totalRevenue.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Expenditure</p>
                        <p className="text-2xl font-bold text-red-600">
                            TSh {totalExpenditure.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Net Revenue</p>
                        <p className={`text-2xl font-bold ${netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            TSh {netRevenue.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Payments</p>
                        <p className="text-2xl font-bold text-gray-900">{totalPayments}</p>
                    </CardContent>
                </Card>
            </div>

            {allMethods.length > 0 ? (
                <>
                    {/* Bar Chart - Top Payment Methods */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Payment Methods by Amount</CardTitle>
                            <CardDescription>
                                Showing top {topMethods.length} payment methods by absolute value
                                {durationInfo && (
                                    <span className="ml-1">over {durationInfo.description}</span>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topMethods} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis 
                                            type="category" 
                                            dataKey="method_name" 
                                            width={80}
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(value) => value.replace(/-/g, ' ')}
                                        />
                                        <Tooltip
                                            formatter={(value: any, name: any, props: any) => {
                                                if (name === 'Revenue') {
                                                    return [`TSh ${Number(value).toLocaleString()}`, 'Revenue']
                                                } else if (name === 'Expenditure') {
                                                    return [`TSh ${Number(value).toLocaleString()}`, 'Expenditure']
                                                }
                                                return [value, name]
                                            }}
                                            labelFormatter={(label) => `Method: ${label.replace(/-/g, ' ')}`}
                                        />
                                        <Legend />
                                        <Bar 
                                            dataKey="total_amount" 
                                            name="Revenue" 
                                            fill="#22c55e" 
                                            radius={[0, 4, 4, 0]}
                                            maxBarSize={40}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Quick Stats & Breakdown */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Revenue Methods */}
                        <Card>
                            <CardHeader className="bg-green-50 border-b border-green-200">
                                <CardTitle className="text-green-900 flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    Revenue Methods
                                </CardTitle>
                                <CardDescription className="text-green-700">
                                    Money coming in through various channels
                                    {durationInfo && (
                                        <span className="block text-green-600 text-sm mt-1">
                                            Over {durationInfo.description}
                                        </span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {revenueMethods.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                        {revenueMethods.map((method: any) => (
                                            <div key={method.method_name} className="p-4 hover:bg-gray-50">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium capitalize text-gray-900">
                                                            {method.method_name.replace(/-/g, ' ')}
                                                        </p>
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            {method.payment_count} payments • Avg: TSh {method.average_payment?.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-green-600 text-lg">
                                                            TSh {method.total_amount?.toLocaleString()}
                                                        </p>
                                                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                                                            {method.percentage}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-gray-500">
                                        No revenue data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Expenditure Methods */}
                        <Card>
                            <CardHeader className="bg-red-50 border-b border-red-200">
                                <CardTitle className="text-red-900 flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    Expenditure Methods
                                </CardTitle>
                                <CardDescription className="text-red-700">
                                    Money going out through various channels
                                    {durationInfo && (
                                        <span className="block text-red-600 text-sm mt-1">
                                            Over {durationInfo.description}
                                        </span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {expenditureMethods.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                        {expenditureMethods.map((method: any) => (
                                            <div key={method.method_name} className="p-4 hover:bg-gray-50">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium capitalize text-gray-900">
                                                            {method.method_name.replace(/-/g, ' ')}
                                                        </p>
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            {method.payment_count} payments • Avg: TSh {method.average_payment?.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-red-600 text-lg">
                                                            TSh {method.total_amount?.toLocaleString()}
                                                        </p>
                                                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                                                            {method.percentage}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-gray-500">
                                        No expenditure data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Methods Breakdown</CardTitle>
                            <CardDescription>
                                Comprehensive view of all payment methods with detailed metrics
                                {durationInfo && (
                                    <span className="block text-gray-600 text-sm mt-1">
                                        Data from {getDateRangeDisplay()} ({durationInfo.description})
                                    </span>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Payment Method</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Total Amount</TableHead>
                                        <TableHead>Payment Count</TableHead>
                                        <TableHead>Average Payment</TableHead>
                                        <TableHead>Percentage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {revenueMethods.map((method: any) => (
                                        <TableRow key={`revenue-${method.method_name}`} className="hover:bg-green-50">
                                            <TableCell className="font-medium capitalize">
                                                {method.method_name.replace(/-/g, ' ')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                                    Revenue
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-green-600 font-semibold">
                                                TSh {method.total_amount?.toLocaleString()}
                                            </TableCell>
                                            <TableCell>{method.payment_count}</TableCell>
                                            <TableCell>
                                                TSh {method.average_payment?.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {method.percentage}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {expenditureMethods.map((method: any) => (
                                        <TableRow key={`expenditure-${method.method_name}`} className="hover:bg-red-50">
                                            <TableCell className="font-medium capitalize">
                                                {method.method_name.replace(/-/g, ' ')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-red-100 text-red-800 border-red-200">
                                                    Expenditure
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-red-600 font-semibold">
                                                TSh {method.total_amount?.toLocaleString()}
                                            </TableCell>
                                            <TableCell>{method.payment_count}</TableCell>
                                            <TableCell>
                                                TSh {method.average_payment?.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {method.percentage}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-gray-500">
                            <p>No payment method data available for the selected period.</p>
                            {durationInfo && (
                                <p className="text-sm mt-2">
                                    Period: {getDateRangeDisplay()} ({durationInfo.description})
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Insights */}
            {allMethods.length > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="text-blue-900">Quick Insights</CardTitle>
                        {durationInfo && (
                            <CardDescription className="text-blue-700">
                                Insights based on data from {durationInfo.description}
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div className="bg-white p-4 rounded-lg border border-blue-200">
                                <h4 className="font-semibold text-blue-800 mb-2">Top Revenue Method</h4>
                                <p className="text-blue-700">
                                    {revenueMethods.length > 0 ? (
                                        <>
                                            <span className="font-bold capitalize">
                                                {revenueMethods[0]?.method_name.replace(/-/g, ' ')}
                                            </span> contributes {revenueMethods[0]?.percentage}% of total revenue
                                        </>
                                    ) : (
                                        "No revenue data"
                                    )}
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-blue-200">
                                <h4 className="font-semibold text-blue-800 mb-2">Largest Expenditure</h4>
                                <p className="text-blue-700">
                                    {expenditureMethods.length > 0 ? (
                                        <>
                                            <span className="font-bold capitalize">
                                                {expenditureMethods[0]?.method_name.replace(/-/g, ' ')}
                                            </span> accounts for {expenditureMethods[0]?.percentage}% of expenses
                                        </>
                                    ) : (
                                        "No expenditure data"
                                    )}
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-blue-200">
                                <h4 className="font-semibold text-blue-800 mb-2">Payment Diversity</h4>
                                <p className="text-blue-700">
                                    {revenueMethods.length} revenue methods • {expenditureMethods.length} expenditure methods
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}