"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Badge } from "@/components/ui/core/badge"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

const ChartContainer = ({ children, className }: any) => {
    return <div className={className}>{children}</div>
}

const getWorkloadVariant = (tasks: number): "outline" | "default" | "secondary" | "destructive" => {
    if (tasks === 0) return "outline";
    if (tasks <= 2) return "default";
    if (tasks <= 5) return "secondary";
    return "destructive";
}

const getWorkloadLabel = (tasks: number): string => {
    if (tasks === 0) return "Available";
    if (tasks <= 2) return "Light";
    if (tasks <= 5) return "Moderate";
    return "Heavy";
}

const ChartTooltip = (props: any) => {
    return <Tooltip {...props} />
}

interface TechnicianWorkloadReport {
    workload_data: {
        name: string
        tasks: number
        in_progress: number
        awaiting_parts: number
        pending: number
    }[]
    total_active_technicians: number
    total_assigned_tasks: number
}

export const TechnicianWorkloadPreview = ({ report }: { report: any }) => {
    const workloadData = report.workload_data || []
    const totalActiveTechnicians = report.total_active_technicians || 0
    const totalAssignedTasks = report.total_assigned_tasks || 0

    // Calculate summary statistics
    const techniciansWithTasks = workloadData.filter((tech: any) => tech.tasks > 0).length
    const averageWorkload = totalActiveTechnicians > 0 ? (totalAssignedTasks / totalActiveTechnicians).toFixed(1) : 0
    const maxWorkload = workloadData.length > 0 ? Math.max(...workloadData.map((tech: any) => tech.tasks)) : 0

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Technicians</p>
                        <p className="text-2xl font-bold text-gray-900">{totalActiveTechnicians}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Tasks</p>
                        <p className="text-2xl font-bold text-blue-600">{totalAssignedTasks}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Avg Workload</p>
                        <p className="text-2xl font-bold text-orange-600">{averageWorkload}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Max Workload</p>
                        <p className="text-2xl font-bold text-red-600">{maxWorkload}</p>
                    </CardContent>
                </Card>
            </div>

            {workloadData.length > 0 ? (
                <>
                    {/* Workload Distribution Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Workload Distribution</CardTitle>
                            <CardDescription>
                                Current task assignments per technician
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={workloadData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 12 }}
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis />
                                        <ChartTooltip
                                            content={({ active, payload }: any) => {
                                                if (active && payload?.length) {
                                                    const data = payload[0].payload
                                                    return (
                                                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                                                            <p className="font-medium">{data.name}</p>
                                                            <p className="text-sm text-gray-600">Total Tasks: {data.tasks}</p>
                                                            <p className="text-sm text-blue-600">In Progress: {data.in_progress}</p>
                                                            <p className="text-sm text-orange-600">Awaiting Parts: {data.awaiting_parts}</p>
                                                            <p className="text-sm text-gray-500">Pending: {data.pending}</p>
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <Bar
                                            dataKey="tasks"
                                            fill="#dc2626"
                                            radius={[4, 4, 0, 0]}
                                            name="Total Tasks"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Detailed Workload Breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Technician Workload Details</CardTitle>
                            <CardDescription>
                                Breakdown of tasks by status for each technician
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Technician</TableHead>
                                        <TableHead>Total Tasks</TableHead>
                                        <TableHead>In Progress</TableHead>
                                        <TableHead>Awaiting Parts</TableHead>
                                        <TableHead>Pending</TableHead>
                                        <TableHead>Workload Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {workloadData.map((tech: any) => (
                                        <TableRow key={tech.name} className="hover:bg-gray-50">
                                            <TableCell className="font-medium">{tech.name}</TableCell>
                                            <TableCell>
                                                <span className="font-bold text-gray-900">{tech.tasks}</span>
                                            </TableCell>
                                            <TableCell>
                                                {tech.in_progress > 0 ? (
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                                        {tech.in_progress}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-gray-400">0</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {tech.awaiting_parts > 0 ? (
                                                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                                        {tech.awaiting_parts}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-gray-400">0</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {tech.pending > 0 ? (
                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                                                        {tech.pending}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-gray-400">0</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getWorkloadVariant(tech.tasks)}>
                                                    {getWorkloadLabel(tech.tasks)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Stacked Bar Chart for Detailed Breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Task Status Breakdown</CardTitle>
                            <CardDescription>
                                Detailed view of task statuses for each technician
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={workloadData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 12 }}
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis />
                                        <ChartTooltip
                                            content={({ active, payload }: any) => {
                                                if (active && payload?.length) {
                                                    return (
                                                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                                                            <p className="font-medium">{payload[0].payload.name}</p>
                                                            {payload.map((entry: any, index: number) => (
                                                                <p key={index} className="text-sm" style={{ color: entry.color }}>
                                                                    {entry.name}: {entry.value}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="in_progress" stackId="a" fill="#3b82f6" name="In Progress" />
                                        <Bar dataKey="awaiting_parts" stackId="a" fill="#f59e0b" name="Awaiting Parts" />
                                        <Bar dataKey="pending" stackId="a" fill="#6b7280" name="Pending" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Capacity Analysis */}
                    <Card className="border-gray-200 bg-green-50">
                        <CardHeader>
                            <CardTitle className="text-green-900">Capacity Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <h4 className="font-semibold text-green-800 mb-2">Available Capacity</h4>
                                    <p className="text-green-700">
                                        <span className="font-bold">
                                            {workloadData.filter((tech: any) => tech.tasks === 0).length}
                                        </span> out of {totalActiveTechnicians} technicians are currently available
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-green-800 mb-2">Workload Distribution</h4>
                                    <p className="text-green-700">
                                        {techniciansWithTasks} technician{techniciansWithTasks === 1 ? '' : 's'} currently handling {totalAssignedTasks} task{totalAssignedTasks === 1 ? '' : 's'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-gray-500">
                            <p>No technician workload data available.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
