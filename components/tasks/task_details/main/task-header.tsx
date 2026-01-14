'use client'

import { useState } from "react"
import { Button } from "@/components/ui/core/button"
import { ArrowLeft, AlertTriangle, CheckCircle, MessageSquare } from "lucide-react"
import { StatusBadge, UrgencyBadge, PaymentStatusBadge, WorkshopStatusBadge } from "@/components/tasks/task_utils/task-badges"
import { useAuth } from "@/hooks/use-auth"
import { addTaskActivity } from "@/lib/api-client"
import { useTask, useUpdateTask } from "@/hooks/use-tasks"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  showTaskMarkedAsDebtToast,
  showPaymentRequiredToast,
} from "@/components/notifications/toast"
import { SendCustomerUpdateModal } from "@/components/tasks/task_details/main/send-customer-update-modal"

interface TaskHeaderProps {
  taskId: string
}

export default function TaskHeader({ taskId }: TaskHeaderProps) {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: taskData, isLoading, isError, error } = useTask(taskId)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)

  const updateTaskMutation = useUpdateTask()

  const handleMarkAsDebt = () => {
    updateTaskMutation.mutate(
      { id: taskId, updates: { is_debt: true } },
      {
        onSuccess: () => {
          showTaskMarkedAsDebtToast(taskData?.title || taskId)
          addTaskActivity(taskId, { type: 'note', message: `Task marked as debt by ${user?.username}` })
        },
      }
    )
  }

  const handleMarkAsPickedUp = () => {
    if (taskData?.payment_status !== "Fully Paid" && !taskData?.is_debt) {
      showPaymentRequiredToast()
      return
    }
    updateTaskMutation.mutate({ id: taskId, updates: { status: "Picked Up" } })
  }



  const isAdmin = user?.role === "Administrator"
  const isManager = user?.role === "Manager"
  const isTechnician = user?.role === "Technician"
  const isFrontDesk = user?.role === "Front Desk"

  const canMarkComplete = isAdmin || isTechnician
  const canMarkPickedUp = isAdmin || isFrontDesk

  if (isLoading) {
    return <div>Loading header...</div>
  }

  if (isError) {
    return <div>Error loading header.</div>
  }
  if (!taskData) {
    return <div>No task data found.</div>
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-red-600" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-grow">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Task Details - {taskData.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={taskData.status} />
            {taskData.workshop_status && (
              <WorkshopStatusBadge status={taskData.workshop_status} />
            )}
            <UrgencyBadge urgency={taskData.urgency} />
            <PaymentStatusBadge status={taskData.payment_status} />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isManager && taskData.payment_status !== "Fully Paid" && !taskData.is_debt && (
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleMarkAsDebt}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Mark as Debt
            </Button>
          )}
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setIsUpdateModalOpen(true)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Customer Update
          </Button>
          {canMarkComplete && (
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Complete
            </Button>
          )}
          {canMarkPickedUp && (
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleMarkAsPickedUp}
              disabled={taskData.status !== "Ready for Pickup" || (taskData.payment_status !== "Fully Paid" && !taskData.is_debt)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Picked Up
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" className="border-gray-300 text-gray-700 bg-transparent">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Cancel Task
            </Button>
          )}
        </div>
      </div>

      {/* Send Customer Update Modal */}
      <SendCustomerUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        taskId={String(taskData.id)}
        customerName={taskData.customer_details?.name || taskData.customer_name || "Customer"}
        phoneNumbers={taskData.customer_details?.phone_numbers || []}
        taskTitle={taskData.title}
        taskStatus={taskData.status}
        brand={taskData.brand_details?.name}
        model={taskData.laptop_model_details?.name}
        description={taskData.description}
        totalCost={taskData.total_cost}
        deviceNotes={taskData.device_notes}
        workshopStatus={taskData.workshop_status || undefined}
      />
    </>
  )
}