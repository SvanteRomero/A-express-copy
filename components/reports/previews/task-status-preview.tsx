"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

const ChartContainer = ({ children, className }: any) => {
    return <div className={className}>{children}</div>
}

const ChartTooltip = (props: any) => {
    return <Tooltip {...props} />
}

interface TaskStatusReport {
    statuses: {
        name: string
        value: number
        color: string
    }[]
    summary: {
        total_tasks: number
        completed_tasks: number
        in_progress_tasks: number
    },
    popular_brand: string;
    popular_model: string;
    top_brands: { brand__name: string; count: number }[];
    top_models: { laptop_model: string; count: number }[];
}

export const TaskStatusPreview = ({ report }: { report: any }) => {
    // Use the actual data structure from your API response
    const statusDistribution = report.status_distribution || []
    const urgencyDistribution = report.urgency_distribution || []
    const totalTasks = report.total_tasks || 0
    const popularBrand = report.popular_brand || "N/A"
    const popularModel = report.popular_model || "N/A"
    const topBrands = report.top_brands || []
    const topModels = report.top_models || []

    // Calculate summary from the actual data
    const completedTasks = statusDistribution.find((s: any) => s.status === 'Completed')?.count || 0
    const inProgressTasks = statusDistribution.find((s: any) => s.status === 'In Progress')?.count || 0

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Tasks</p>
                        <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Completed</p>
                        <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">In Progress</p>
                        <p className="text-2xl font-bold text-orange-600">{inProgressTasks}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Most Popular Brand</p>
                        <p className="text-2xl font-bold text-gray-900">{popularBrand}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Most Popular Model</p>
                        <p className="text-2xl font-bold text-gray-900">{popularModel}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Top 5 Brands</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topBrands}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="brand__name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="count" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top 5 Models</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topModels}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="laptop_model" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="count" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="count"
                                    >
                                        {statusDistribution.map((entry: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    entry.status === 'Completed' ? '#22c55e' :
                                                        entry.status === 'In Progress' ? '#f97316' :
                                                            entry.status === 'Pending' ? '#eab308' :
                                                                entry.status === 'Awaiting Parts' ? '#f59e0b' :
                                                                    '#6b7280' // default gray
                                                }
                                            />
                                        ))}
                                    </Pie>
                                    <ChartTooltip
                                        content={({ active, payload }: any) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload
                                                return (
                                                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                                                        <p className="font-medium">{data.status}</p>
                                                        <p className="text-sm text-gray-600">
                                                            {data.count} tasks ({data.percentage}%)
                                                        </p>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Status Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {statusDistribution.map((status: any) => (
                                <div key={status.status} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    status.status === 'Completed' ? '#22c55e' :
                                                        status.status === 'In Progress' ? '#f97316' :
                                                            status.status === 'Pending' ? '#eab308' :
                                                                status.status === 'Awaiting Parts' ? '#f59e0b' :
                                                                    '#6b7280'
                                            }}
                                        />
                                        <span className="font-medium">{status.status}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">{status.count}</p>
                                        <p className="text-sm text-gray-500">{status.percentage}%</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Urgency Distribution Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Urgency Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Urgency Level</TableHead>
                                <TableHead>Task Count</TableHead>
                                <TableHead>Percentage</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {urgencyDistribution.map((urgency: any) => (
                                <TableRow key={urgency.urgency}>
                                    <TableCell className="font-medium">{urgency.urgency}</TableCell>
                                    <TableCell>{urgency.count}</TableCell>
                                    <TableCell>
                                        {totalTasks > 0 ? ((urgency.count / totalTasks) * 100).toFixed(1) : 0}%
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Generated At Info */}
            <Card className="border-gray-200 bg-gray-50">
                <CardContent className="p-4">
                    <p className="text-sm text-gray-600">
                        Report generated on: {new Date(report.generated_at).toLocaleString()}
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

