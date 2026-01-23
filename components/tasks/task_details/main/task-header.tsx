'use client'

import { useState } from "react"
import { Button } from "@/components/ui/core/button"
import { ArrowLeft, AlertTriangle, CheckCircle, MessageSquare } from "lucide-react"
import { StatusBadge, UrgencyBadge, PaymentStatusBadge, WorkshopStatusBadge } from "@/components/tasks/task_utils/task-badges"
import { useAuth } from "@/hooks/use-auth"
import { addTaskActivity, requestDebt } from "@/lib/api-client"
import { useTask, useUpdateTask } from "@/hooks/use-tasks"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/feedback/alert-dialog"
import { toast } from "@/hooks/use-toast"
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
  const [isRequestingDebt, setIsRequestingDebt] = useState(false)

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
    if (taskData?.status === 'Terminated') {
      // For terminated tasks, allow pickup without payment check
      updateTaskMutation.mutate({ id: taskId, updates: { status: "Picked Up" } })
      return
    }
    if (taskData?.payment_status !== "Fully Paid" && !taskData?.is_debt) {
      showPaymentRequiredToast()
      return
    }
    updateTaskMutation.mutate({ id: taskId, updates: { status: "Picked Up" } })
  }

  const handleTerminateTask = () => {
    updateTaskMutation.mutate({
      id: taskId,
      updates: {
        is_terminated: true,
        status: 'Ready for Pickup'
      }
    })
  }

  const handleRequestDebt = async () => {
    setIsRequestingDebt(true)
    try {
      await requestDebt(taskId)
      toast({
        title: '📤 Debt Request Sent',
        description: 'Waiting for manager approval...',
        className: 'bg-blue-600 text-white border-blue-600',
      })
    } catch (error) {
      toast({
        title: '❌ Error',
        description: 'Failed to send debt request. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsRequestingDebt(false)
    }
  }



  const isAdmin = user?.role === "Administrator"
  const isManager = user?.role === "Manager"
  const isTechnician = user?.role === "Technician"
  const isFrontDesk = user?.role === "Front Desk"
  const isAccountant = user?.role === "Accountant"

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
          <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900">Task Details - {taskData.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={taskData.status} isTerminated={taskData.is_terminated} />
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
          {(isFrontDesk || isAccountant) && taskData.payment_status !== "Fully Paid" && !taskData.is_debt && (
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={handleRequestDebt}
              disabled={isRequestingDebt}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {isRequestingDebt ? 'Requesting...' : 'Request Debt'}
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
          {canMarkPickedUp && !taskData.is_terminated && taskData.status !== "Picked Up" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  variant="destructive"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Terminate Task
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Terminate Task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the task as terminated. The customer can then collect their device.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleTerminateTask}>
                    Terminate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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