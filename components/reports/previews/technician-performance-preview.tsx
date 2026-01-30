"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Badge } from "@/components/ui/core/badge"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { useState } from "react"
import React from "react"
import type { TechnicianPerformanceReport } from "../types"

const ChartContainer = ({ children, className }: any) => {
    return <div className={className}>{children}</div>
}

const ChartTooltip = (props: any) => {
    return <Tooltip {...props} />
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
                        <p className="text-sm text-gray-600">Current Tasks</p>
                        <p className="text-2xl font-bold text-orange-600">{summary.total_current_tasks || 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Active Tasks</p>
                        <p className="text-2xl font-bold text-indigo-600">{summary.total_tasks_in_period || 0}</p>
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
                                    <TableHead>Avg Time</TableHead>
                                    <TableHead>% of Tasks Involved</TableHead>
                                    <TableHead>Workshop Rate</TableHead>
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
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium">{tech.completed_tasks_count}</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(tech.solved_count ?? 0) > 0 && (
                                                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                                                Solved: {tech.solved_count}
                                                            </Badge>
                                                        )}
                                                        {(tech.not_solved_count ?? 0) > 0 && (
                                                            <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                                                                Not Solved: {tech.not_solved_count}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium">{tech.current_assigned_tasks}</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(tech.in_progress_count ?? 0) > 0 && (
                                                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                                                In Progress: {tech.in_progress_count}
                                                            </Badge>
                                                        )}
                                                        {(tech.in_workshop_count ?? 0) > 0 && (
                                                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                                                In Workshop: {tech.in_workshop_count}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {(tech.avg_completion_hours ?? 0) > 0 ? (
                                                    <span className="font-medium">{tech.avg_completion_hours?.toFixed(1)}h</span>
                                                ) : (
                                                    <span className="text-gray-400">N/A</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {(tech.percentage_of_tasks_involved ?? 0).toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={(tech.workshop_rate ?? 0) >= 50 ? "destructive" : "secondary"}>
                                                    {(tech.workshop_rate ?? 0).toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>

                                        {/* Expanded Details */}
                                        {expandedTechnician === tech.technician_id && (
                                            <TableRow key={`${tech.technician_id}-details`}>
                                                <TableCell colSpan={5} className="p-4">
                                                    <div className="space-y-4">
                                                        {/* Task Status Breakdown */}
                                                        <div>
                                                            <h4 className="font-semibold mb-2">Performance Metrics</h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                {Object.entries(tech.status_counts).map(([status, count]) => (
                                                                    <div key={`${tech.technician_id}-status-${status}`} className="text-center p-2 bg-white rounded border">
                                                                        <div className="font-semibold">{count}</div>
                                                                        <div className="text-sm text-gray-600">{status}</div>
                                                                    </div>
                                                                ))}

                                                                <div className="text-center p-2 bg-white rounded border">
                                                                    <div className="font-semibold">{(tech.workshop_rate ?? 0).toFixed(1)}%</div>
                                                                    <div className="text-sm text-gray-600">Workshop Rate</div>
                                                                </div>
                                                            </div>
                                                        </div>



                                                        {/* Current Tasks by Status */}
                                                        <div>
                                                            <h4 className="font-semibold mb-2">Current Tasks</h4>
                                                            .
                                                            .
                                                            .
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