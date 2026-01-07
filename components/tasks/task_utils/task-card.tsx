
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/layout/card"
import { Badge } from "@/components/ui/core/badge"
import { Laptop, MapPin, User as UserIcon } from "lucide-react"
import { StatusBadge, PaymentStatusBadge } from "./task-badges"
import { TaskActions } from "./task-actions"

interface TaskCardProps {
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
}

export function TaskCard({
    task,
    onRowClick,
    isManagerView,
    isAccountantView,
    ...actionProps
}: TaskCardProps) {
    return (
        <Card className="overflow-hidden" onClick={() => onRowClick(task)}>
            <CardHeader className="p-4 flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex flex-col gap-1">
                    <div className="font-semibold text-red-600">#{task.title}</div>
                    <div className="text-sm font-medium">{task.customer_details?.name}</div>
                </div>
                {task.workshop_status === 'In Workshop' ? (
                    <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-100">
                        In Workshop
                    </Badge>
                ) : (
                    <StatusBadge status={task.status} />
                )}
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Laptop className="h-4 w-4" />
                    <span>{task.laptop_model_details?.name}</span>
                </div>

                <div className="text-sm text-gray-600">
                    {isManagerView ? (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{task.current_location}</span>
                        </div>
                    ) : isAccountantView ? (
                        <div className="font-medium">
                            Balance: TSh {task.outstanding_balance}
                        </div>
                    ) : (
                        <p className="line-clamp-2">{task.description}</p>
                    )}
                </div>

                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span>{task.assigned_to_details?.full_name || "Unassigned"}</span>
                    </div>
                    <div><PaymentStatusBadge status={task.payment_status} /></div>
                </div>
            </CardContent>
            {actionProps.showActions && (
                <CardFooter className="p-4 bg-gray-50 flex flex-wrap gap-2 justify-end">
                    <TaskActions
                        task={task}
                        onRowClick={onRowClick}
                        isManagerView={isManagerView}
                        isAccountantView={isAccountantView}
                        {...actionProps}
                    />
                </CardFooter>
            )}
        </Card>
    )
}
