"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Badge } from "@/components/ui/core/badge"

interface TaskDetail {
    task_id: number
    task_title: string
    customer_name: string
    laptop_model: string
    brand: string
    status: string
    urgency: string
    assigned_technician: string
    date_in: string
    days_in_shop: number
    estimated_cost: number
}

interface LocationData {
    location: string
    total_tasks: number
    avg_days_in_shop: number
    status_breakdown: {
        status: string
        count: number
        percentage: number
    }[]
    urgency_breakdown: {
        urgency: string
        count: number
        percentage: number
    }[]
    tasks: TaskDetail[]
}

interface InventoryLocationReport {
    locations: LocationData[]
    summary: {
        total_laptops_in_shop: number
        total_locations: number
        overall_avg_days_in_shop: number
        most_busy_location: string
        most_busy_location_count: number
    }
}

export const InventoryLocationPreview = ({ report }: { report: InventoryLocationReport }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'In Progress': return 'bg-blue-100 text-blue-800'
            case 'Pending': return 'bg-yellow-100 text-yellow-800'
            case 'Awaiting Parts': return 'bg-orange-100 text-orange-800'
            case 'Ready for Pickup': return 'bg-green-100 text-green-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'Expedited': return 'bg-red-100 text-red-800'
            case 'Ina Haraka': return 'bg-orange-100 text-orange-800'
            case 'Kaacha': return 'bg-yellow-100 text-yellow-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getLocationStatus = (taskCount: number) => {
        if (taskCount >= 10) return { label: 'Very Busy', color: 'destructive' as const }
        if (taskCount >= 5) return { label: 'Busy', color: 'secondary' as const }
        return { label: 'Available', color: 'default' as const }
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Laptops in Shop</p>
                        <p className="text-2xl font-bold text-gray-900">{report.summary.total_laptops_in_shop}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Locations</p>
                        <p className="text-2xl font-bold text-blue-600">{report.summary.total_locations}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Avg Days in Shop</p>
                        <p className="text-2xl font-bold text-orange-600">{report.summary.overall_avg_days_in_shop}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Busiest Location</p>
                        <p className="text-xl font-bold text-purple-600">{report.summary.most_busy_location}</p>
                        <p className="text-sm text-gray-500">{report.summary.most_busy_location_count} laptops</p>
                    </CardContent>
                </Card>
            </div>

            {/* Location Summary Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Laptops in Shop by Location</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Location</TableHead>
                                <TableHead>Laptop Count</TableHead>
                                <TableHead>Avg Days</TableHead>
                                <TableHead>Status Breakdown</TableHead>
                                <TableHead>Urgency Breakdown</TableHead>
                                <TableHead>Workload</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {report.locations.map(location => {
                                const status = getLocationStatus(location.total_tasks)
                                return (
                                    <TableRow key={location.location}>
                                        <TableCell className="font-medium">{location.location}</TableCell>
                                        <TableCell className="font-semibold">{location.total_tasks}</TableCell>
                                        <TableCell>{location.avg_days_in_shop} days</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                {location.status_breakdown.slice(0, 3).map(statusItem => (
                                                    <Badge 
                                                        key={statusItem.status}
                                                        variant="secondary"
                                                        className={`text-xs ${getStatusColor(statusItem.status)}`}
                                                    >
                                                        {statusItem.status}: {statusItem.count}
                                                    </Badge>
                                                ))}
                                                {location.status_breakdown.length > 3 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{location.status_breakdown.length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                {location.urgency_breakdown.slice(0, 2).map(urgencyItem => (
                                                    <Badge 
                                                        key={urgencyItem.urgency}
                                                        variant="secondary"
                                                        className={`text-xs ${getUrgencyColor(urgencyItem.urgency)}`}
                                                    >
                                                        {urgencyItem.urgency}: {urgencyItem.count}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={status.color}>
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Detailed Task Tables for Each Location */}
            {report.locations.map(location => (
                <Card key={location.location}>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>{location.location} - {location.total_tasks} Laptops</span>
                            <div className="flex gap-2 text-sm font-normal">
                                <Badge variant="outline">Avg: {location.avg_days_in_shop} days</Badge>
                                <Badge variant={getLocationStatus(location.total_tasks).color}>
                                    {getLocationStatus(location.total_tasks).label}
                                </Badge>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Laptop Model</TableHead>
                                    <TableHead>Brand</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Urgency</TableHead>
                                    <TableHead>Technician</TableHead>
                                    <TableHead>Days in Shop</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {location.tasks.map(task => (
                                    <TableRow key={task.task_id}>
                                        <TableCell className="font-medium">{task.task_title}</TableCell>
                                        <TableCell>{task.customer_name}</TableCell>
                                        <TableCell>{task.laptop_model}</TableCell>
                                        <TableCell>{task.brand}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={getStatusColor(task.status)}>
                                                {task.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getUrgencyColor(task.urgency)}>
                                                {task.urgency}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{task.assigned_technician}</TableCell>
                                        <TableCell>
                                            <Badge variant={task.days_in_shop > 14 ? "destructive" : "outline"}>
                                                {task.days_in_shop} days
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}