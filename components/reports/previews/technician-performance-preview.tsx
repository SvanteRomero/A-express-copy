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
                        <p className="text-sm text-gray-600">Total Executed Tasks</p>
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
                        <p className="text-sm text-gray-600">Total Tasks In Period</p>
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
                                    <TableHead>Executed Tasks</TableHead>
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
                                                <TableCell colSpan={6} className="p-6 bg-gradient-to-br from-gray-50 to-white">
                                                    <div className="space-y-6">
                                                        {/* Key Performance Indicators */}
                                                        <div>
                                                            <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                                                                <span className="w-1 h-5 bg-blue-600 rounded"></span>
                                                                Key Performance Indicators
                                                            </h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                                {/* Solve Rate */}
                                                                <div className="bg-white rounded-lg border-2 border-gray-200 p-3 hover:shadow-md transition-shadow">
                                                                    <div className="text-xs text-gray-600 mb-1.5">Solve Rate</div>
                                                                    <div className="flex items-baseline gap-1.5">
                                                                        <div className={`text-xl font-bold ${(tech.solve_rate ?? 0) >= 80 ? 'text-green-600' :
                                                                            (tech.solve_rate ?? 0) >= 50 ? 'text-yellow-600' :
                                                                                'text-red-600'
                                                                            }`}>
                                                                            {(tech.solve_rate ?? 0).toFixed(1)}%
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-500">
                                                                            {tech.solved_count ?? 0}/{tech.completed_tasks_count}
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5">
                                                                        <div
                                                                            className={`h-1.5 rounded-full transition-all ${(tech.solve_rate ?? 0) >= 80 ? 'bg-green-600' :
                                                                                (tech.solve_rate ?? 0) >= 50 ? 'bg-yellow-600' :
                                                                                    'bg-red-600'
                                                                                }`}
                                                                            style={{ width: `${Math.min(tech.solve_rate ?? 0, 100)}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>

                                                                {/* Tasks Executed */}
                                                                <div className="bg-white rounded-lg border-2 border-blue-200 p-3 hover:shadow-md transition-shadow">
                                                                    <div className="text-xs text-gray-600 mb-1.5">Tasks Executed</div>
                                                                    <div className="text-xl font-bold text-blue-600">
                                                                        {tech.completed_tasks_count}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                                                        in this period
                                                                    </div>
                                                                </div>

                                                                {/* Average Time */}
                                                                <div className="bg-white rounded-lg border-2 border-purple-200 p-3 hover:shadow-md transition-shadow">
                                                                    <div className="text-xs text-gray-600 mb-1.5">Avg Time</div>
                                                                    <div className="text-xl font-bold text-purple-600">
                                                                        {(tech.avg_completion_hours ?? 0) > 0 ? `${tech.avg_completion_hours?.toFixed(1)}h` : 'N/A'}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                                                        per task
                                                                    </div>
                                                                </div>

                                                                {/* Workshop Rate */}
                                                                <div className="bg-white rounded-lg border-2 border-orange-200 p-3 hover:shadow-md transition-shadow">
                                                                    <div className="text-xs text-gray-600 mb-1.5">Workshop Rate</div>
                                                                    <div className={`text-xl font-bold ${(tech.workshop_rate ?? 0) >= 50 ? 'text-red-600' :
                                                                        (tech.workshop_rate ?? 0) >= 25 ? 'text-orange-600' :
                                                                            'text-green-600'
                                                                        }`}>
                                                                        {(tech.workshop_rate ?? 0).toFixed(1)}%
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                                                        tasks to workshop
                                                                    </div>
                                                                </div>

                                                                {/* Task Involvement */}
                                                                <div className="bg-white rounded-lg border-2 border-indigo-200 p-3 hover:shadow-md transition-shadow">
                                                                    <div className="text-xs text-gray-600 mb-1.5">Task Involvement</div>
                                                                    <div className="text-xl font-bold text-indigo-600">
                                                                        {(tech.percentage_of_tasks_involved ?? 0).toFixed(1)}%
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                                                        of all tasks
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Peer Comparison */}
                                                        {tech.rank && (
                                                            <div>
                                                                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                                                    <span className="w-1 h-6 bg-purple-600 rounded"></span>
                                                                    Peer Comparison
                                                                </h4>
                                                                <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                        {/* Overall Performance */}
                                                                        <div className="space-y-3">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-sm font-medium text-gray-700">Overall Rank</span>
                                                                                <Badge
                                                                                    variant={tech.rank === 1 ? "default" : "secondary"}
                                                                                    className={`text-base px-3 py-1 ${tech.rank === 1 ? 'bg-yellow-500 hover:bg-yellow-600' :
                                                                                        tech.rank === 2 ? 'bg-gray-400 hover:bg-gray-500' :
                                                                                            tech.rank === 3 ? 'bg-orange-600 hover:bg-orange-700' :
                                                                                                'bg-blue-600 hover:bg-blue-700'
                                                                                        }`}
                                                                                >
                                                                                    #{tech.rank} of {technicianPerformance.length}
                                                                                </Badge>
                                                                            </div>
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-sm font-medium text-gray-700">Percentile</span>
                                                                                <span className="text-lg font-bold text-indigo-600">
                                                                                    Top {(100 - (tech.percentile ?? 0)).toFixed(0)}%
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Specific Rankings */}
                                                                        <div className="space-y-3">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-sm font-medium text-gray-700">Solve Rate Rank</span>
                                                                                <Badge variant="outline" className="border-green-600 text-green-700">
                                                                                    #{tech.rank_by_solve_rate}
                                                                                </Badge>
                                                                            </div>
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-sm font-medium text-gray-700">Speed Rank</span>
                                                                                <Badge variant="outline" className="border-purple-600 text-purple-700">
                                                                                    {tech.rank_by_avg_time ? `#${tech.rank_by_avg_time}` : 'N/A'}
                                                                                </Badge>
                                                                            </div>
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-sm font-medium text-gray-700">Workshop Efficiency</span>
                                                                                <Badge variant="outline" className="border-orange-600 text-orange-700">
                                                                                    #{tech.rank_by_workshop_rate}
                                                                                </Badge>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Current Tasks Summary */}
                                                        <div>
                                                            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                                                <span className="w-1 h-6 bg-green-600 rounded"></span>
                                                                Current Workload
                                                            </h4>
                                                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                                <div className="flex flex-wrap gap-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                                                        <span className="text-sm text-gray-700">
                                                                            <span className="font-semibold">{tech.in_progress_count ?? 0}</span> In Progress
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                                                        <span className="text-sm text-gray-700">
                                                                            <span className="font-semibold">{tech.in_workshop_count ?? 0}</span> In Workshop
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                                                                        <span className="text-sm text-gray-700">
                                                                            <span className="font-semibold">{tech.current_assigned_tasks}</span> Total Current
                                                                        </span>
                                                                    </div>
                                                                </div>
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