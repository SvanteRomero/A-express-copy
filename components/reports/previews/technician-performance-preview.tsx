"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Badge } from "@/components/ui/core/badge"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { useState } from "react"
import React from "react"

const ChartContainer = ({ children, className }: any) => {
    return <div className={className}>{children}</div>
}

const ChartTooltip = (props: any) => {
    return <Tooltip {...props} />
}

interface TaskDetail {
    task_id: number
    task_title: string
    customer_name: string
    laptop_model: string
    date_in: string
    estimated_cost: number
    total_cost: number
    paid_amount: number
}

interface CompletedTaskDetail {
    task_id: number
    task_title: string
    completion_hours: number
    revenue: number
}

interface TechnicianPerformance {
    technician_id: number
    technician_name: string
    technician_email: string
    completed_tasks_count: number
    total_revenue_generated: number
    avg_completion_hours: number
    current_in_progress_tasks: number
    current_assigned_tasks: number
    tasks_by_status: {
        [status: string]: TaskDetail[]
    }
    status_counts: {
        [status: string]: number
    }
    completed_tasks_detail: CompletedTaskDetail[]
    total_tasks_handled: number
    completion_rate: number
    workload_level: string
}

interface TechnicianPerformanceReport {
    technician_performance: TechnicianPerformance[]
    date_range: string
    total_technicians: number
    summary: {
        total_completed_tasks: number
        total_revenue: number
        avg_completion_hours: number
        total_current_tasks: number
    }
}

export const TechnicianPerformancePreview = ({ report }: { report: TechnicianPerformanceReport }) => {
    const [expandedTechnician, setExpandedTechnician] = useState<number | null>(null)
    const technicianPerformance = report.technician_performance || []
    const totalTechnicians = report.total_technicians || 0
    const dateRange = report.date_range || 'last_30_days'
    const summary = report.summary || {}

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'In Progress': return 'bg-blue-100 text-blue-800'
            case 'Pending': return 'bg-yellow-100 text-yellow-800'
            case 'Awaiting Parts': return 'bg-orange-100 text-orange-800'
            case 'Ready for Pickup': return 'bg-green-100 text-green-800'
            case 'Completed': return 'bg-purple-100 text-purple-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getWorkloadColor = (level: string) => {
        switch (level) {
            case 'High': return 'bg-red-100 text-red-800'
            case 'Medium': return 'bg-yellow-100 text-yellow-800'
            case 'Low': return 'bg-green-100 text-green-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const toggleTechnicianDetails = (technicianId: number) => {
        setExpandedTechnician(expandedTechnician === technicianId ? null : technicianId)
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Technicians</p>
                        <p className="text-2xl font-bold text-gray-900">{totalTechnicians}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Completed Tasks</p>
                        <p className="text-2xl font-bold text-blue-600">{summary.total_completed_tasks || 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-600">
                            TSh {summary.total_revenue?.toLocaleString() || '0'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Current Tasks</p>
                        <p className="text-2xl font-bold text-orange-600">{summary.total_current_tasks || 0}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Table */}
            {technicianPerformance.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Technician Performance Overview</CardTitle>
                        <CardDescription>
                            Comprehensive performance metrics for {technicianPerformance.length} technician{technicianPerformance.length !== 1 ? 's' : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Technician</TableHead>
                                    <TableHead>Completed Tasks</TableHead>
                                    <TableHead>Current Tasks</TableHead>
                                    <TableHead>Total Revenue</TableHead>
                                    <TableHead>Avg Completion</TableHead>
                                    <TableHead>Completion Rate</TableHead>
                                    <TableHead>Workload</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {technicianPerformance.map((tech) => (
                                    <React.Fragment key={tech.technician_id}>
                                        <TableRow 
                                            className="hover:bg-gray-50 cursor-pointer"
                                            onClick={() => toggleTechnicianDetails(tech.technician_id)}
                                        >
                                            <TableCell className="font-medium">
                                                <div>
                                                    <div>{tech.technician_name}</div>
                                                    <div className="text-xs text-gray-500">{tech.technician_email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold">{tech.completed_tasks_count}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium">{tech.current_assigned_tasks}</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(tech.status_counts).slice(0, 3).map(([status, count]) => (
                                                            <Badge 
                                                                key={`${tech.technician_id}-${status}`}
                                                                variant="secondary" 
                                                                className={`text-xs ${getStatusColor(status)}`}
                                                            >
                                                                {status}: {count}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-green-600 font-semibold">
                                                TSh {tech.total_revenue_generated.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {tech.avg_completion_hours > 0 ? `${tech.avg_completion_hours}h` : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={tech.completion_rate >= 70 ? "default" : "secondary"}>
                                                    {tech.completion_rate.toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getWorkloadColor(tech.workload_level)}>
                                                    {tech.workload_level}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                        
                                        {/* Expanded Details */}
                                        {expandedTechnician === tech.technician_id && (
                                            <TableRow key={`${tech.technician_id}-details`}>
                                                <TableCell colSpan={7} className="p-4">
                                                    <div className="space-y-4">
                                                        {/* Task Status Breakdown */}
                                                        <div>
                                                            <h4 className="font-semibold mb-2">Task Status Breakdown</h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                {Object.entries(tech.status_counts).map(([status, count]) => (
                                                                    <div key={`${tech.technician_id}-status-${status}`} className="text-center p-2 bg-white rounded border">
                                                                        <div className="font-semibold">{count}</div>
                                                                        <div className="text-sm text-gray-600">{status}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Completed Tasks Detail */}
                                                        {tech.completed_tasks_detail.length > 0 && (
                                                            <div>
                                                                <h4 className="font-semibold mb-2">Recently Completed Tasks</h4>
                                                                <div className="space-y-2">
                                                                    {tech.completed_tasks_detail.slice(0, 5).map((task) => (
                                                                        <div key={`${tech.technician_id}-completed-${task.task_id}`} className="flex justify-between items-center p-2 bg-white rounded border">
                                                                            <span className="font-medium">{task.task_title}</span>
                                                                            <div className="flex gap-4 text-sm">
                                                                                <span>Time: {task.completion_hours}h</span>
                                                                                <span className="text-green-600">Revenue: TSh {task.revenue.toLocaleString()}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Current Tasks by Status */}
                                                        <div>
                                                            <h4 className="font-semibold mb-2">Current Tasks</h4>
                                                            <div className="space-y-2">
                                                                {Object.entries(tech.tasks_by_status)
                                                                    .filter(([status]) => !['Completed', 'Picked Up', 'Terminated'].includes(status))
                                                                    .map(([status, tasks]) => (
                                                                        <div key={`${tech.technician_id}-current-${status}`}>
                                                                            <h5 className="font-medium text-sm mb-1">{status} ({tasks.length})</h5>
                                                                            <div className="space-y-1">
                                                                                {tasks.slice(0, 3).map((task) => (
                                                                                    <div key={`${tech.technician_id}-task-${task.task_id}`} className="text-sm p-1 bg-white rounded">
                                                                                        {task.task_title} - {task.customer_name} ({task.laptop_model})
                                                                                    </div>
                                                                                ))}
                                                                                {tasks.length > 3 && (
                                                                                    <div className="text-xs text-gray-500">+{tasks.length - 3} more tasks</div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-gray-500">
                            <p>No technician performance data available for the selected period.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Performance Charts */}
            {technicianPerformance.length > 0 && (
                <div className="mt-6 space-y-6">
                    {/* Revenue Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue Generated by Technician</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={technicianPerformance}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="technician_name"
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                            tick={{ fontSize: 12 }}
                                        />
                                        <YAxis />
                                        <ChartTooltip
                                            content={({ active, payload }: any) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload
                                                    return (
                                                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                                                            <p className="font-medium">{data.technician_name}</p>
                                                            <p className="text-sm text-green-600 font-semibold">
                                                                TSh {data.total_revenue_generated?.toLocaleString() || '0'}
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                {data.completed_tasks_count} completed tasks
                                                            </p>
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <Bar
                                            dataKey="total_revenue_generated"
                                            fill="#22c55e"
                                            radius={[4, 4, 0, 0]}
                                            name="Revenue (TSh)"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Task Summary Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Task Distribution by Technician</CardTitle>
                            <CardDescription>
                                Completed vs. Current assigned tasks for each technician
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={technicianPerformance} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="technician_name" type="category" width={100} />
                                        <ChartTooltip
                                            content={({ active, payload }: any) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload
                                                    return (
                                                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                                                            <p className="font-medium">{data.technician_name}</p>
                                                            <p className="text-sm text-blue-600">Completed: {data.completed_tasks_count}</p>
                                                            <p className="text-sm text-orange-600">Current: {data.current_assigned_tasks}</p>
                                                            <p className="text-sm text-gray-600">Completion Rate: {data.completion_rate.toFixed(1)}%</p>
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="completed_tasks_count" fill="#3b82f6" name="Completed Tasks" />
                                        <Bar dataKey="current_assigned_tasks" fill="#f97316" name="Current Tasks" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}