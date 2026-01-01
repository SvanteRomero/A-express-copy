'use client'

import { useState } from "react"
import { Button } from "@/components/ui/core/button"
import { Badge } from "@/components/ui/core/badge"
import { ArrowLeft, AlertTriangle, CheckCircle, MessageSquare } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { updateTask, addTaskActivity } from "@/lib/api-client"
import { useTask } from "@/hooks/use-data"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { SendCustomerUpdateModal } from "@/components/tasks/task_details/main/send-customer-update-modal"

interface TaskHeaderProps {
  taskId: string
}

export default function TaskHeader({ taskId }: TaskHeaderProps) {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: taskData, isLoading, isError, error } = useTask(taskId)
  const { toast } = useToast()
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)

  const updateTaskMutation = useMutation({
    mutationFn: (updates: { [key: string]: any }) => updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] })
    },
  })

  const handleMarkAsDebt = () => {
    updateTaskMutation.mutate(
      { is_debt: true },
      {
        onSuccess: () => {
          toast({ title: "Task Marked as Debt", description: `Task ${taskData?.title} has been marked as debt.` })
          addTaskActivity(taskId, { message: `Task marked as debt by ${user?.username}` })
        },
      }
    )
  }

  const handleMarkAsPickedUp = () => {
    if (taskData?.payment_status !== "Fully Paid" && !taskData?.is_debt) {
      toast({
        title: "Payment Required",
        description: "This task cannot be marked as picked up until it is fully paid. Please contact the manager for assistance.",
        variant: "destructive",
      })
      return
    }
    updateTaskMutation.mutate({ status: "Picked Up" })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Assigned - Not Accepted":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Not Accepted</Badge>
      case "Diagnostic":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Diagnostic</Badge>
      case "In Progress":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>
      case "Awaiting Parts":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Awaiting Parts</Badge>
      case "Ready for Pickup":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ready for Pickup</Badge>
      case "Completed":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Completed</Badge>
      case "Terminated":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Terminated</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "Yupo":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Yupo</Badge>
      case "Katoka kidogo":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Katoka kidogo</Badge>
      case "Kaacha":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Kaacha</Badge>
      case "Expedited":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Expedited</Badge>
      case "Ina Haraka":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Ina Haraka</Badge>
      default:
        return <Badge variant="secondary">{urgency}</Badge>
    }
  }

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "Unpaid":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{paymentStatus}</Badge>
      case "Partially Paid":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{paymentStatus}</Badge>
      case "Fully Paid":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{paymentStatus}</Badge>
      case "Refunded":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{paymentStatus}</Badge>
      default:
        return <Badge variant="secondary">{paymentStatus}</Badge>
    }
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
            {getStatusBadge(taskData.status)}
            {taskData.workshop_status && (
              <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-100">{taskData.workshop_status}</Badge>
            )}
            {getUrgencyBadge(taskData.urgency)}
            {getPaymentStatusBadge(taskData.payment_status)}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isManager && taskData.payment_status !== "Fully Paid" && (
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
      />
    </>
  )
}