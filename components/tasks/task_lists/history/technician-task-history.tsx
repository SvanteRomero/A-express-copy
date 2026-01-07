'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { StatusBadge, UrgencyBadge, WorkshopStatusBadge } from "@/components/tasks/task_utils/task-badges"
import { useAuth } from "@/lib/auth-context"
import { Laptop } from "lucide-react"
import { useTechnicianHistoryTasks } from "@/hooks/use-data"



export function HistoryTasksList() {
    const { user } = useAuth()
    const { data: tasks, isLoading, isError, error } = useTechnicianHistoryTasks(user?.id);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Task History</CardTitle>
                    <CardDescription>Your past and completed tasks.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Task History</CardTitle>
                    <CardDescription>Your past and completed tasks.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-red-500">Error: {(error as any).message}</div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Task History</CardTitle>
                <CardDescription>Your past and completed tasks.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6">
                    {tasks?.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">No history found.</div>
                    ) : (
                        tasks?.map((task) => (
                            <div key={task.id} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">{task.customer_details?.name}</h3>
                                                <p className="text-sm text-gray-500">Task ID: <span className="font-medium text-red-600">{task.title}</span></p>
                                            </div>
                                            <UrgencyBadge urgency={task.urgency} />
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <p className="text-sm font-medium text-gray-800">{task.description}</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Laptop className="h-4 w-4" />
                                                <span>{task.brand_details?.name} {task.laptop_model_details?.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={task.status} />
                                            </div>
                                            {task.workshop_status && (
                                                <div className="flex items-center gap-2">
                                                    <WorkshopStatusBadge status={task.workshop_status} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4 flex flex-col justify-between items-end">
                                        <Button variant="outline" asChild className="w-full md:w-auto">
                                            <a href={`/dashboard/tasks/${encodeURIComponent(task.title)}`}>View Details</a>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
