'use client'
import React from "react"
import { TechnicianTaskDetails } from "@/components/tasks/task_details/technician/technician-task-details"

interface TechnicianTaskProps {
    params: Promise<{
        id: string
    }>
}

/**
 * Dedicated technician task details route.
 * This route always shows the TechnicianTaskDetails component regardless of user role.
 * Used by managers accessing their assigned tasks from the "My Tasks" tab.
 */
export default function TechnicianTask({ params: paramsPromise }: TechnicianTaskProps) {
    const params = React.use(paramsPromise)

    return <TechnicianTaskDetails taskId={params.id} />
}
