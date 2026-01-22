'use client'

import { useEffect, useState } from "react"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Button } from "@/components/ui/core/button"
import { ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react"
import { TaskFilters } from "./task-filters"
import { getTaskStatusOptions } from "@/hooks/use-tasks"
import { useIsMobile } from "@/hooks/use-mobile"
import AddPaymentDialog from "../add-payment-dialog"
import { useTaskFiltering } from "@/hooks/use-task-filtering"
import { TaskCard } from "./task-card"
import { TaskTableRow } from "./task-table-row"

interface TasksDisplayProps {
  tasks: any[]
  technicians: any[]
  onRowClick: (task: any) => void
  showActions: boolean
  onDeleteTask?: (taskTitle: string) => void
  onProcessPickup?: (taskTitle: string) => void
  onApprove?: (taskTitle: string) => void
  onReject?: (taskTitle: string, notes: string) => void
  isCompletedTab?: boolean
  onTerminateTask?: (taskTitle: string) => void
  isManagerView?: boolean
  isFrontDeskCompletedView?: boolean
  isPickupView?: boolean
  onPickedUp?: (taskTitle: string) => void
  onNotifyCustomer?: (taskTitle: string, customerName: string) => void
  isHistoryView?: boolean
  onReturnTask?: (task: any) => void
  isAccountantView?: boolean
  onAddPayment?: (taskId: string, amount: number, paymentMethodId: number) => void
  onRemindDebt?: (taskId: string) => void
  approvingTaskId?: string | null
  pickingUpTaskId?: string | null
}

export function TasksDisplay({
  tasks,
  technicians,
  onRowClick,
  showActions,
  onDeleteTask,
  onProcessPickup,
  onApprove,
  onReject,
  isCompletedTab,
  onTerminateTask,
  isManagerView,
  isFrontDeskCompletedView,
  isPickupView,
  onPickedUp,
  onNotifyCustomer,
  isHistoryView,
  onReturnTask,
  isAccountantView,
  onAddPayment,
  onRemindDebt,
  approvingTaskId,
  pickingUpTaskId
}: TasksDisplayProps) {
  const isMobile = useIsMobile()
  const [statusOptions, setStatusOptions] = useState<string[]>([])

  // Payment Dialog State
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false)
  const [selectedTaskToPay, setSelectedTaskToPay] = useState<any | null>(null)

  const {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    technicianFilter, setTechnicianFilter,
    urgencyFilter, setUrgencyFilter,
    locationFilter, setLocationFilter,
    sortField,
    sortDirection,
    handleSort,
    clearAllFilters,
    filteredAndSortedTasks,
    uniqueTechnicians,
    uniqueUrgencies,
    uniqueLocations
  } = useTaskFiltering(tasks, technicians)

  useEffect(() => {
    const fetchStatusOptions = async () => {
      try {
        const response = await getTaskStatusOptions()
        setStatusOptions((response.data || []).map((option: any) => option[0]))
      } catch (error) {
        console.error("Error fetching status options:", error)
      }
    }
    fetchStatusOptions()
  }, [])

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4" />
    if (sortDirection === "desc") return <ArrowDown className="h-4 w-4" />
    return <ArrowUpDown className="h-4 w-4" />
  }

  // Handler for opening payment dialog from TaskActions
  const handleAddPaymentClick = (task: any) => {
    setSelectedTaskToPay(task)
    setIsAddPaymentDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <TaskFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        technicianFilter={technicianFilter}
        setTechnicianFilter={setTechnicianFilter}
        urgencyFilter={urgencyFilter}
        setUrgencyFilter={setUrgencyFilter}
        locationFilter={locationFilter}
        setLocationFilter={setLocationFilter}
        uniqueStatuses={statusOptions}
        uniqueTechnicians={uniqueTechnicians}
        uniqueUrgencies={uniqueUrgencies}
        uniqueLocations={uniqueLocations}
        clearAllFilters={clearAllFilters}
      />

      {isMobile ? (
        <div className="space-y-4">
          {filteredAndSortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onRowClick={onRowClick}
              showActions={showActions}
              isManagerView={isManagerView}
              isAccountantView={isAccountantView}
              onDeleteTask={onDeleteTask}
              onApprove={onApprove}
              onReject={onReject}
              onTerminateTask={onTerminateTask}
              onPickedUp={onPickedUp}
              onNotifyCustomer={onNotifyCustomer}
              onReturnTask={onReturnTask}
              onAddPayment={handleAddPaymentClick}
              onRemindDebt={onRemindDebt}
              isFrontDeskCompletedView={isFrontDeskCompletedView}
              isPickupView={isPickupView}
              isHistoryView={isHistoryView}
              isCompletedTab={isCompletedTab}
              approvingTaskId={approvingTaskId}
              pickingUpTaskId={pickingUpTaskId}
            />
          ))}
          {filteredAndSortedTasks.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or filters</p>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-900">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("title")}
                    className="h-auto p-0 font-semibold text-gray-900 hover:text-red-600"
                  >
                    Task ID {getSortIcon("title")}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-gray-900">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("customer_details.name")}
                    className="h-auto p-0 font-semibold text-gray-900 hover:text-red-600"
                  >
                    Customer {getSortIcon("customer_name")}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-gray-900">Device</TableHead>
                {isManagerView ? (
                  <TableHead className="font-semibold text-gray-900">Location</TableHead>
                ) : isAccountantView ? (
                  <TableHead className="font-semibold text-gray-900">Outstanding Balance</TableHead>
                ) : (
                  <TableHead className="font-semibold text-gray-900">Issue</TableHead>
                )}
                <TableHead className="font-semibold text-gray-900">Status</TableHead>
                <TableHead className="font-semibold text-gray-900">Technician</TableHead>
                {isManagerView && !isCompletedTab ? (
                  <TableHead className="font-semibold text-gray-900">Task Urgency</TableHead>
                ) : (
                  <TableHead className="font-semibold text-gray-900">Payment</TableHead>
                )}
                {showActions && (
                  <TableHead className="font-semibold text-gray-900">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTasks.map((task) => (
                <TaskTableRow
                  key={task.id}
                  task={task}
                  onRowClick={onRowClick}
                  showActions={showActions}
                  isManagerView={isManagerView}
                  isAccountantView={isAccountantView}
                  onDeleteTask={onDeleteTask}
                  onApprove={onApprove}
                  onReject={onReject}
                  onTerminateTask={onTerminateTask}
                  onPickedUp={onPickedUp}
                  onNotifyCustomer={onNotifyCustomer}
                  onReturnTask={onReturnTask}
                  onAddPayment={handleAddPaymentClick}
                  onRemindDebt={onRemindDebt}
                  isFrontDeskCompletedView={isFrontDeskCompletedView}
                  isPickupView={isPickupView}
                  isHistoryView={isHistoryView}
                  isCompletedTab={isCompletedTab}
                  approvingTaskId={approvingTaskId}
                  pickingUpTaskId={pickingUpTaskId}
                />
              ))}
            </TableBody>
          </Table>
          {filteredAndSortedTasks.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or filters</p>
            </div>
          )}
        </div>
      )}

      {selectedTaskToPay && (
        <AddPaymentDialog
          isOpen={isAddPaymentDialogOpen}
          onClose={() => {
            setIsAddPaymentDialogOpen(false)
            setSelectedTaskToPay(null)
          }}
          onSubmit={(amount, methodId) => {
            onAddPayment?.(selectedTaskToPay.title, amount, methodId)
            setIsAddPaymentDialogOpen(false)
            setSelectedTaskToPay(null)
          }}
          taskTitle={selectedTaskToPay.title}
          outstandingBalance={selectedTaskToPay.outstanding_balance}
        />
      )}
    </div>
  )
}
