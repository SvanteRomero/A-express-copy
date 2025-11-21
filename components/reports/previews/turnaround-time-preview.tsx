"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Badge } from "@/components/ui/core/badge"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { Button } from "@/components/ui/core/button"

const ChartContainer = ({ children, className }: any) => {
    return <div className={className}>{children}</div>
}

const ChartTooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    return (
        <div className="bg-white border p-2 rounded shadow-sm text-sm">
            {label && <div className="font-semibold mb-1">{label}</div>}
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                    <span className="text-gray-700">{p.name ?? p.dataKey}</span>
                    <span className="font-medium text-gray-900">{p.value} days</span>
                </div>
            ))}
        </div>
    )
}

const ChartTooltip = (props: any) => {
    return <Tooltip {...props} />
}

interface TaskDetail {
    title: string
    customer_name: string
    intake_date: string
    intake_time: string
    pickup_date: string
    pickup_time: string
    assigned_technician: string
    turnaround_days: number
    return_count: number
}

interface TurnaroundTimeReport {
    periods: {
        period: string
        average_turnaround: number
        tasks_completed: number
    }[]
    task_details: TaskDetail[]
    summary: {
        overall_average: number
        best_period: string
        improvement: number
        total_tasks_analyzed: number
        total_returns?: number
        tasks_with_returns?: number
        avg_returns_per_task?: number
    }
}

export const TurnaroundTimePreview = ({
    report,
    searchTerm,
    onPageChange,
    isLoading = false
}: {
    report: TurnaroundTimeReport & {
        pagination?: {
            current_page: number
            page_size: number
            total_tasks: number
            total_pages: number
            has_next: boolean
            has_previous: boolean
        }
    }
    searchTerm: string
    onPageChange?: (page: number, pageSize: number) => void
    isLoading?: boolean
}) => {
    // Add safety checks for the report data
    const summary = report.summary || {}
    const periods = report.periods || []
    const taskDetails = report.task_details || []
    const pagination = report.pagination

    const getReturnCountColor = (count: number) => {
        if (count === 0) return "bg-green-100 text-green-800"
        if (count === 1) return "bg-yellow-100 text-yellow-800"
        if (count === 2) return "bg-orange-100 text-orange-800"
        return "bg-red-100 text-red-800"
    }

    const getReturnCountLabel = (count: number) => {
        if (count === 0) return "No Returns"
        if (count === 1) return "1 Return"
        return `${count} Returns`
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Overall Average</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {summary.overall_average ? `${summary.overall_average} days` : 'N/A'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Best Period</p>
                        <p className="text-xl font-bold text-green-600">
                            {summary.best_period || 'N/A'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Improvement</p>
                        <p className="text-2xl font-bold text-green-600">
                            {summary.improvement ? `${summary.improvement}%` : 'N/A'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Tasks Analyzed</p>
                        <p className="text-2xl font-bold text-purple-600">
                            {summary.total_tasks_analyzed || 0}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Return Statistics Cards - Only show if data exists */}
            {(summary.total_returns !== undefined || summary.tasks_with_returns !== undefined) && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-gray-600">Total Returns</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {summary.total_returns || 0}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-gray-600">Tasks with Returns</p>
                            <p className="text-2xl font-bold text-red-600">
                                {summary.tasks_with_returns || 0}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-gray-600">Avg Returns per Task</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {summary.avg_returns_per_task ? summary.avg_returns_per_task.toFixed(1) : '0.0'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {periods.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Turnaround Time Trends</CardTitle></CardHeader>
                    <CardContent>
                        <ChartContainer className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={periods}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="period" />
                                    <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar 
                                        dataKey="average_turnaround" 
                                        fill="#3b82f6" 
                                        radius={[4, 4, 0, 0]}
                                        name="Avg Turnaround"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            )}

            {/* Individual Task Details Table - ONLY ONE INSTANCE */}
            <Card>
                <CardHeader>
                    <CardTitle>Individual Task Turnaround Times</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Task Title</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Intake Date/Time</TableHead>
                                <TableHead>Pickup Date/Time</TableHead>
                                <TableHead>Technician</TableHead>
                                <TableHead>Turnaround</TableHead>
                                <TableHead>Times Returned</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                // Loading state
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-4">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                            Loading tasks...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : taskDetails.length > 0 ? (
                                taskDetails.map((task, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{task.title}</TableCell>
                                        <TableCell>{task.customer_name}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div>{task.intake_date}</div>
                                                <div className="text-gray-500">{task.intake_time}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div>{task.pickup_date}</div>
                                                <div className="text-gray-500">{task.pickup_time}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{task.assigned_technician}</TableCell>
                                        <TableCell className="font-semibold">
                                            {task.turnaround_days} days
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={getReturnCountColor(task.return_count || 0)}
                                                variant="secondary"
                                            >
                                                {getReturnCountLabel(task.return_count || 0)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                                        No task details available
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {/* Add pagination controls */}
                    {pagination && onPageChange && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-gray-600">
                                Showing {((pagination.current_page - 1) * pagination.page_size) + 1} to{' '}
                                {Math.min(pagination.current_page * pagination.page_size, pagination.total_tasks)} of{' '}
                                {pagination.total_tasks} tasks
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onPageChange(pagination.current_page - 1, pagination.page_size)}
                                    disabled={!pagination.has_previous || isLoading}
                                    className="px-3 py-1 text-sm"
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-gray-600 min-w-[80px] text-center">
                                    Page {pagination.current_page} of {pagination.total_pages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onPageChange(pagination.current_page + 1, pagination.page_size)}
                                    disabled={!pagination.has_next || isLoading}
                                    className="px-3 py-1 text-sm"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Period Summary Table */}
            {periods.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Period Summary</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Avg Turnaround</TableHead>
                                    <TableHead>Tasks Completed</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {periods.map((period) => (
                                    <TableRow key={period.period}>
                                        <TableCell className="font-medium">{period.period}</TableCell>
                                        <TableCell className="font-semibold">
                                            {period.average_turnaround ? `${period.average_turnaround} days` : 'N/A'}
                                        </TableCell>
                                        <TableCell>{period.tasks_completed || 0}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {periods.length === 0 && taskDetails.length === 0 && (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-gray-500">
                            <p>No turnaround time data available for the selected period.</p>
                            <p className="text-sm mt-2">Tasks need to be marked as picked up to appear in this report.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}