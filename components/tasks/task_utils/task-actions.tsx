
import { useState } from "react"
import { Button } from "@/components/ui/core/button"
import { Edit, Trash2, CheckCircle, MessageSquare } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/feedback/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/feedback/dialog"
import { Textarea } from "@/components/ui/core/textarea"

interface TaskActionsProps {
    task: any
    onRowClick?: (task: any) => void
    onDeleteTask?: (taskTitle: string) => void
    onApprove?: (taskTitle: string) => void
    onReject?: (taskTitle: string, notes: string) => void
    onTerminateTask?: (taskTitle: string) => void
    onPickedUp?: (taskTitle: string) => void
    onNotifyCustomer?: (taskTitle: string, customerName: string) => void
    onReturnTask?: (task: any) => void
    onAddPayment?: (task: any) => void
    onRemindDebt?: (taskId: string) => void
    isManagerView?: boolean
    isFrontDeskCompletedView?: boolean
    isPickupView?: boolean
    isHistoryView?: boolean
    isAccountantView?: boolean
    isCompletedTab?: boolean
    showActions?: boolean
    approvingTaskId?: string | null
}

export function TaskActions({
    task,
    onRowClick,
    onDeleteTask,
    onApprove,
    onReject,
    onTerminateTask,
    onPickedUp,
    onNotifyCustomer,
    onReturnTask,
    onAddPayment,
    onRemindDebt,
    isManagerView,
    isFrontDeskCompletedView,
    isPickupView,
    isHistoryView,
    isAccountantView,
    isCompletedTab,
    showActions,
    approvingTaskId
}: TaskActionsProps) {
    const [rejectionNotes, setRejectionNotes] = useState("")
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

    if (!showActions) return null

    // Helper to stop propagation
    const stopProp = (e: React.MouseEvent) => e.stopPropagation()

    if (isHistoryView && task.status === 'Picked Up' && new Date(task.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        return (
            <Button
                size="sm"
                variant="outline"
                className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto"
                onClick={(e) => {
                    stopProp(e)
                    onReturnTask?.(task)
                }}
            >
                Return
            </Button>
        )
    }

    if (isPickupView) {
        return (
            <div className="flex gap-2 w-full justify-end" onClick={stopProp}>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
                            disabled={task.payment_status !== 'Fully Paid' && !task.is_debt}
                        >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Picked Up
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will mark the task as picked up.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onPickedUp?.(task)}>
                                Confirm
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 sm:flex-none"
                    onClick={() => onNotifyCustomer?.(task.title, task.customer_details?.name)}
                >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Notify
                </Button>
            </div>
        )
    }

    if (isFrontDeskCompletedView) {
        const isApproving = approvingTaskId === task.title;
        return (
            <div className="flex gap-2 w-full justify-end" onClick={stopProp}>
                <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none disabled:opacity-50"
                    onClick={() => onApprove?.(task.title)}
                    disabled={isApproving || !!approvingTaskId}
                >
                    {isApproving ? "Approving..." : "Approve"}
                </Button>
                <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1 sm:flex-none"
                        >
                            Reject
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reject Task {task.title}</DialogTitle>
                        </DialogHeader>
                        <Textarea
                            placeholder="Enter rejection notes..."
                            value={rejectionNotes}
                            onChange={(e) => setRejectionNotes(e.target.value)}
                        />
                        <DialogFooter>
                            <Button
                                onClick={() => {
                                    onReject?.(task.title, rejectionNotes)
                                    setRejectionNotes("")
                                    setIsRejectDialogOpen(false)
                                }}
                            >
                                Confirm
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        )
    }

    if (isAccountantView) {
        return (
            <div className="flex gap-2 w-full justify-end" onClick={stopProp}>
                <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                    onClick={() => onAddPayment?.(task)}
                >
                    Add Payment
                </Button>
                {onRemindDebt && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() => onRemindDebt(task.title)}
                    >
                        Remind Debt
                    </Button>
                )}
            </div>
        )
    }

    if (isCompletedTab) {
        return (
            <div className="flex gap-2 w-full justify-end" onClick={stopProp}>
                <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
                    onClick={() => {
                        // Add notification logic here in the future
                    }}
                >
                    Notify Customer
                </Button>
                {isHistoryView && task.status === 'Picked Up' && new Date(task.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() => onReturnTask?.(task)}
                    >
                        Return
                    </Button>
                )}
            </div>
        )
    }

    // Default actions (Edit/Delete/Terminate)
    if (["Pending", "In Progress"].includes(task.status)) {
        return (
            <div className="flex gap-2 w-full justify-end" onClick={stopProp}>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="w-full sm:w-auto"
                        >
                            Terminate
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will terminate the task.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onTerminateTask?.(task.title)}>
                                Terminate
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )
    }

    return (
        <div className="flex gap-2 w-full justify-end" onClick={stopProp}>
            <Button
                size="sm"
                variant="outline"
                className="border-gray-300 text-gray-600 hover:bg-gray-50 bg-transparent flex-1 sm:flex-none"
                onClick={() => onRowClick?.(task)}
            >
                <Edit className="h-3 w-3 mr-1" />
                Edit
            </Button>
            {onDeleteTask && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1 sm:flex-none"
                        >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the task.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteTask(task.title)}>
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    )
}
