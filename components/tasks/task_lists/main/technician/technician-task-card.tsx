'use client'

import { Button } from "@/components/ui/core/button"
import { StatusBadge, UrgencyBadge, WorkshopStatusBadge } from "@/components/tasks/task_utils/task-badges"
import { Laptop } from "lucide-react"
import { Task } from "@/components/tasks/types"

interface TechnicianTaskCardProps {
    task: Task
}

export function TechnicianTaskCard({ task }: TechnicianTaskCardProps) {
    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
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
                            <span>{task.brand_details?.name} {task.laptop_model_details?.name || task.laptop_model}</span>
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
    )
}
