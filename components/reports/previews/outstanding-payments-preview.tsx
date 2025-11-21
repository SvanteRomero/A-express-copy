"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Badge } from "@/components/ui/core/badge"
import { useState, useEffect } from "react"

interface OutstandingTask {
    task_id: string
    customer_name: string
    customer_phone: string
    total_cost: number
    paid_amount: number
    outstanding_balance: number
    days_overdue: number
    status: string
    date_in: string
}

interface OutstandingPaymentsReport {
    outstanding_tasks: OutstandingTask[]
    summary: {
        total_outstanding: number
        task_count: number
        average_balance: number
    }
    pagination?: {
        current_page: number
        page_size: number
        total_tasks: number
        total_pages: number
        has_next: boolean
        has_previous: boolean
    }
}

interface OutstandingPaymentsPreviewProps {
    report: OutstandingPaymentsReport
    searchTerm: string
    onPageChange: (page: number, pageSize: number) => void
    isLoading?: boolean
}

export const OutstandingPaymentsPreview = ({ 
    report, 
    searchTerm, 
    onPageChange,
    isLoading = false 
}: OutstandingPaymentsPreviewProps) => {
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Sync with report pagination - FIXED VERSION
    useEffect(() => {
        if (report.pagination) {
            setCurrentPage(report.pagination.current_page)
            setItemsPerPage(report.pagination.page_size)
        } else {
            // Reset to defaults if no pagination info
            setCurrentPage(1)
            setItemsPerPage(10)
        }
    }, [report.pagination?.current_page, report.pagination?.page_size]) // Watch specific properties

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage)
        onPageChange(newPage, itemsPerPage)
    }

    const handleItemsPerPageChange = (newSize: number) => {
        const newPage = 1 // Reset to first page when changing page size
        setItemsPerPage(newSize)
        setCurrentPage(newPage)
        onPageChange(newPage, newSize)
    }

    const filteredTasks = report.outstanding_tasks.filter(task =>
        task.task_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.customer_phone.includes(searchTerm)
    )

    const pagination = report.pagination

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Outstanding</p>
                        <p className="text-2xl font-bold text-red-600">
                            TSh {report.summary.total_outstanding.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Tasks</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {report.summary.task_count}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Average Balance</p>
                        <p className="text-2xl font-bold text-gray-900">
                            TSh {report.summary.average_balance.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Outstanding Payments</CardTitle>
                    <CardDescription>
                        {pagination ? (
                            <>
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                                {Math.min(currentPage * itemsPerPage, pagination.total_tasks)} of{" "}
                                {pagination.total_tasks} tasks
                            </>
                        ) : (
                            `${filteredTasks.length} tasks found`
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Page Size Selector */}
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
                                Show:
                            </label>
                            <select
                                id="itemsPerPage"
                                value={itemsPerPage}
                                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                disabled={isLoading}
                                className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
                            >
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                            </select>
                            <span className="text-sm text-gray-600">per page</span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
                                <div className="text-gray-600">Loading...</div>
                            </div>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Total Cost</TableHead>
                                    <TableHead>Paid</TableHead>
                                    <TableHead>Outstanding</TableHead>
                                    <TableHead>Days Overdue</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.length > 0 ? (
                                    filteredTasks.map(task => (
                                        <TableRow key={`${task.task_id}-${currentPage}`}>
                                            <TableCell className="font-medium">{task.task_id}</TableCell>
                                            <TableCell>{task.customer_name}</TableCell>
                                            <TableCell>{task.customer_phone}</TableCell>
                                            <TableCell>TSh {task.total_cost.toLocaleString()}</TableCell>
                                            <TableCell>TSh {task.paid_amount.toLocaleString()}</TableCell>
                                            <TableCell className="font-semibold text-red-600">
                                                TSh {task.outstanding_balance.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={task.days_overdue > 7 ? "destructive" : "secondary"}>
                                                    {task.days_overdue} days
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={task.status === "Completed" ? "default" : "secondary"}>
                                                    {task.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-4 text-gray-500">
                                            No tasks found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {pagination && pagination.total_pages > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Page {currentPage} of {pagination.total_pages}
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={!pagination.has_previous || isLoading}
                                    className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={!pagination.has_next || isLoading}
                                    className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}