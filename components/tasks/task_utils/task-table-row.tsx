
import { TableCell, TableRow } from "@/components/ui/layout/table"
import { Badge } from "@/components/ui/core/badge"
import { Laptop, User as UserIcon } from "lucide-react"
import { StatusBadge, PaymentStatusBadge, WorkshopStatusBadge, UrgencyBadge } from "./task-badges"
import { TaskActions } from "./task-actions"
import { Button } from "@/components/ui/core/button"

interface TaskTableRowProps {
    task: any
    onRowClick: (task: any) => void
    isManagerView?: boolean
    isAccountantView?: boolean
    // Action props
    onDeleteTask?: (taskTitle: string) => void
    onApprove?: (taskTitle: string) => void
    onReject?: (taskTitle: string, notes: string) => void
    onTerminateTask?: (taskTitle: string) => void
    onPickedUp?: (taskTitle: string) => void
    onNotifyCustomer?: (taskTitle: string, customerName: string) => void
    onReturnTask?: (task: any) => void
    onAddPayment?: (task: any) => void
    onRemindDebt?: (taskId: string) => void
    isFrontDeskCompletedView?: boolean
    isPickupView?: boolean
    isHistoryView?: boolean
    isCompletedTab?: boolean
    showActions?: boolean
    approvingTaskId?: string | null
    pickingUpTaskId?: string | null
    isMyTasksTab?: boolean
}

export function TaskTableRow({
    task,
    onRowClick,
    isManagerView,
    isAccountantView,
    isPickupView,
    isCompletedTab,
    isMyTasksTab,
    ...actionProps
}: TaskTableRowProps) {
    const isCurrentTasks = isManagerView && !isCompletedTab
    return (
        <TableRow
            className="hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onRowClick(task)}
        >
            <TableCell className="font-medium text-red-600">{task.title}</TableCell>
            <TableCell>
                <div>
                    <p className="font-medium text-gray-900">{task.customer_details?.name}</p>
                    <p className="text-sm text-gray-500">
                        {task.customer_details?.phone_numbers?.[0]?.phone_number}
                        {task.customer_details?.phone_numbers?.length > 1 && ' ...'}
                    </p>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{task.laptop_model_details?.name}</span>
                </div>
            </TableCell>
            {isMyTasksTab ? (
                <TableCell className="text-gray-600 max-w-xs truncate">
                    {task.description}
                </TableCell>
            ) : isManagerView ? (
                <TableCell className="text-gray-600 max-w-xs truncate">
                    {!isCompletedTab ? task.current_location_details?.name : <WorkshopStatusBadge status={task.workshop_status || "N/A"} />}
                </TableCell>
            ) : isAccountantView ? (
                <TableCell className="text-gray-600 max-w-xs truncate">
                    TSh {task.outstanding_balance}
                </TableCell>
            ) : (
                <TableCell className="text-gray-600 max-w-xs truncate">
                    {task.description}
                </TableCell>
            )}
            <TableCell>
                {isPickupView ? (
                    <WorkshopStatusBadge status={task.workshop_status || "N/A"} />
                ) : (
                    <StatusBadge status={task.status} isTerminated={task.is_terminated} />
                )}
            </TableCell>
            {(isCurrentTasks || isMyTasksTab) && (
                <TableCell>
                    <WorkshopStatusBadge status={task.workshop_status || "N/A"} />
                </TableCell>
            )}
            <TableCell>
                <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">
                        {task.assigned_to_details?.full_name || "Unassigned"}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                {isMyTasksTab ? (
                    <UrgencyBadge urgency={task.urgency} />
                ) : isManagerView && !isCompletedTab ? (
                    <UrgencyBadge urgency={task.urgency} />
                ) : (
                    <PaymentStatusBadge status={task.payment_status} />
                )}
            </TableCell>
            {isMyTasksTab && (
                <TableCell className="text-gray-900">
                    TSh {task.total_cost ? Number(task.total_cost).toLocaleString() : '0'}
                </TableCell>
            )}
            {actionProps.showActions && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                    <TaskActions
                        task={task}
                        onRowClick={onRowClick}
                        isManagerView={isManagerView}
                        isAccountantView={isAccountantView}
                        isPickupView={isPickupView}
                        {...actionProps}
                    />
                </TableCell>
            )}
        </TableRow>
    )
}
