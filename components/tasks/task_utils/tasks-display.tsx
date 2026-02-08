'use client'

import { useEffect, useState } from "react"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Button } from "@/components/ui/core/button"
import { ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react"
import { TaskFilters } from "./task-filters"
import { getTaskStatusOptions } from "@/hooks/use-tasks"
import { useIsMobile } from "@/hooks/use-mobile"
import AddPaymentDialog from "../add-payment-dialog"
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
  isMyTasksTab?: boolean
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
  // Server-side filter state and setters
  serverSideFilters?: {
    technicianId?: number | string
    setTechnicianId?: (id: number | string) => void
    urgency?: string
    setUrgency?: (u: string) => void
    deviceStatus?: string
    setDeviceStatus?: (s: string) => void
    location?: string
    setLocation?: (l: string) => void
    taskStatus?: string
    setTaskStatus?: (s: string) => void
  }
  // Filter options from parent (for server-side filtering)
  filterOptions?: {
    urgencies?: string[]
    deviceStatuses?: string[]
    locations?: { id: number, name: string }[] | string[] // Support both objects and strings for flexibility
  }
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
  pickingUpTaskId,
  isMyTasksTab,
  searchQuery: externalSearchQuery,
  onSearchQueryChange: onExternalSearchQueryChange,
  serverSideFilters,
  filterOptions
}: TasksDisplayProps) {
  const isMobile = useIsMobile()
  const [statusOptions, setStatusOptions] = useState<string[]>([])

  const isCurrentTasks = isManagerView && !isCompletedTab

  // Payment Dialog State
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false)
  const [selectedTaskToPay, setSelectedTaskToPay] = useState<any | null>(null)

  const [internalSearchQuery, setInternalSearchQuery] = useState(externalSearchQuery || "")

  // Sync external search query to internal state
  useEffect(() => {
    if (externalSearchQuery !== undefined && externalSearchQuery !== internalSearchQuery) {
      setInternalSearchQuery(externalSearchQuery)
    }
  }, [externalSearchQuery])

  // Debounce search updates
  useEffect(() => {
    const handler = setTimeout(() => {
      if (onExternalSearchQueryChange && internalSearchQuery !== externalSearchQuery) {
        onExternalSearchQueryChange(internalSearchQuery)
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [internalSearchQuery, onExternalSearchQueryChange, externalSearchQuery])


  // Sort state
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc")
      else if (sortDirection === "desc") {
        setSortField(null)
        setSortDirection(null)
      }
      else setSortDirection("asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // -- Filter State (Client-Side Fallback) --
  // If serverSideFilters is NOT provided, we might still need local state for client-side filtering support?
  // But our goal is to move everything to server-side.
  // TechnicianTasksPage uses TasksDisplay without serverSideFilters prop initially?
  // No, TechnicianTasksPage passes onSearchQueryChange.
  // We will assume if serverSideFilters is missing, we just display tasks as-is (except sorting).
  // If pages want filtering, they must provide serverSideFilters or pre-filter the tasks.

  const [localTaskStatusFilter, setLocalTaskStatusFilter] = useState("all")
  const [localTechnicianFilter, setLocalTechnicianFilter] = useState("all")
  const [localUrgencyFilter, setLocalUrgencyFilter] = useState("all")
  const [localDeviceStatusFilter, setLocalDeviceStatusFilter] = useState("all")
  const [localLocationFilter, setLocalLocationFilter] = useState("all")

  // Determine effective setters and values
  const effectiveSearchQuery = internalSearchQuery;
  const setEffectiveSearchQuery = setInternalSearchQuery;

  const effectiveTechnicianFilter = serverSideFilters?.technicianId !== undefined ? serverSideFilters.technicianId : localTechnicianFilter;
  const setEffectiveTechnicianFilter = (val: string | number) => {
    if (serverSideFilters?.setTechnicianId) serverSideFilters.setTechnicianId(val);
    else setLocalTechnicianFilter(String(val));
  };

  const effectiveUrgencyFilter = serverSideFilters?.urgency !== undefined ? serverSideFilters.urgency : localUrgencyFilter;
  const setEffectiveUrgencyFilter = (val: string) => {
    if (serverSideFilters?.setUrgency) serverSideFilters.setUrgency(val);
    else setLocalUrgencyFilter(val);
  };

  const effectiveDeviceStatusFilter = serverSideFilters?.deviceStatus !== undefined ? serverSideFilters.deviceStatus : localDeviceStatusFilter;
  const setEffectiveDeviceStatusFilter = (val: string) => {
    if (serverSideFilters?.setDeviceStatus) serverSideFilters.setDeviceStatus(val);
    else setLocalDeviceStatusFilter(val);
  };

  const effectiveLocationFilter = serverSideFilters?.location !== undefined ? serverSideFilters.location : localLocationFilter;
  const setEffectiveLocationFilter = (val: string) => {
    if (serverSideFilters?.setLocation) serverSideFilters.setLocation(val);
    else setLocalLocationFilter(val);
  };

  const effectiveTaskStatusFilter = serverSideFilters?.taskStatus !== undefined ? serverSideFilters.taskStatus : localTaskStatusFilter;
  const setEffectiveTaskStatusFilter = (val: string) => {
    if (serverSideFilters?.setTaskStatus) serverSideFilters.setTaskStatus(val);
    else setLocalTaskStatusFilter(val);
  };

  // Sorting Logic
  // We sort the tasks array that is passed in.
  // If serverSideFilters is active, 'tasks' is already filtered by server.
  // If not, we assume 'tasks' is what we want to show (maybe pre-filtered by parent).
  // We only apply client-side sorting here.

  const effectiveFilteredTasks = [...tasks].sort((a, b) => {
    if (!sortField || !sortDirection) return 0

    const getField = (obj: any, path: string) => {
      return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }
    const aValue = getField(a, sortField)
    const bValue = getField(b, sortField)

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  });

  // Unique Options Calculation (Fallback)
  // Only calculate if not provided by parent options
  // (Moving logic from useTaskFiltering)

  const uniqueTechnicians = technicians.map((tech) => ({ id: tech.id, full_name: `${tech.first_name} ${tech.last_name}`.trim() }));
  const uniqueUrgencies = [...new Set(tasks.map((task) => task?.urgency || "").filter((urgency: any) => urgency))];
  const uniqueDeviceStatuses = [...new Set(tasks.map((task) => task?.workshop_status || "").filter((status: any) => status))];
  const uniqueLocations = [...new Set(tasks.map((task) => task?.current_location || "").filter((location: any) => location))];

  // Use passed options if available, otherwise fall back to computed ones
  const effectiveUniqueUrgencies = filterOptions?.urgencies || uniqueUrgencies;
  // Combine computed technicians with passed ones if needed, but existing logic uses `technicians` prop which is fine.
  // Actually uniqueTechnicians is computed from `technicians` prop which is correct.

  const effectiveUniqueDeviceStatuses = filterOptions?.deviceStatuses || uniqueDeviceStatuses;
  const effectiveUniqueLocations = filterOptions?.locations || uniqueLocations;

  const handleClearFilters = () => {
    if (serverSideFilters) {
      // Clear Server Side
      if (onExternalSearchQueryChange) onExternalSearchQueryChange("");
      if (serverSideFilters.setTaskStatus) serverSideFilters.setTaskStatus("all");
      if (serverSideFilters.setTechnicianId) serverSideFilters.setTechnicianId("all");
      if (serverSideFilters.setUrgency) serverSideFilters.setUrgency("all");
      if (serverSideFilters.setDeviceStatus) serverSideFilters.setDeviceStatus("all");
      if (serverSideFilters.setLocation) serverSideFilters.setLocation("all");
    } else {
      // Clear Local
      setInternalSearchQuery("");
      setLocalTaskStatusFilter("all");
      setLocalTechnicianFilter("all");
      setLocalUrgencyFilter("all");
      setLocalDeviceStatusFilter("all");
      setLocalLocationFilter("all");
    }
    setSortField(null);
    setSortDirection(null);
  }

  // Determine if technician filter should be shown
  const showTechnicianFilter = serverSideFilters?.setTechnicianId !== undefined;

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
        searchQuery={effectiveSearchQuery}
        setSearchQuery={setEffectiveSearchQuery}
        taskStatusFilter={effectiveTaskStatusFilter}
        setTaskStatusFilter={setEffectiveTaskStatusFilter}
        technicianFilter={effectiveTechnicianFilter}
        setTechnicianFilter={setEffectiveTechnicianFilter}
        urgencyFilter={effectiveUrgencyFilter}
        setUrgencyFilter={setEffectiveUrgencyFilter}
        deviceStatusFilter={effectiveDeviceStatusFilter}
        setDeviceStatusFilter={setEffectiveDeviceStatusFilter}
        locationFilter={effectiveLocationFilter}
        setLocationFilter={setEffectiveLocationFilter}
        uniqueStatuses={statusOptions}
        uniqueTechnicians={uniqueTechnicians}
        uniqueUrgencies={effectiveUniqueUrgencies}
        uniqueDeviceStatuses={effectiveUniqueDeviceStatuses}
        uniqueLocations={effectiveUniqueLocations}
        clearAllFilters={handleClearFilters}
        showDeviceStatusFilter={!isCurrentTasks}
        showLocationFilter={isCurrentTasks}
        showTechnicianFilter={showTechnicianFilter}
      />

      {isMobile ? (
        <div className="space-y-4">
          {effectiveFilteredTasks.map((task) => (
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
              isMyTasksTab={isMyTasksTab}
            />
          ))}
          {effectiveFilteredTasks.length === 0 && (
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
                {isMyTasksTab ? (
                  <TableHead className="font-semibold text-gray-900">Issue</TableHead>
                ) : isManagerView ? (
                  <TableHead className="font-semibold text-gray-900">{isCurrentTasks ? "Location" : "Device Status"}</TableHead>
                ) : isAccountantView ? (
                  <TableHead className="font-semibold text-gray-900">Outstanding Balance</TableHead>
                ) : (
                  <TableHead className="font-semibold text-gray-900">Issue</TableHead>
                )}
                <TableHead className="font-semibold text-gray-900">{isPickupView ? "Device Status" : "Task Status"}</TableHead>
                {(isCurrentTasks || isMyTasksTab) && (
                  <TableHead className="font-semibold text-gray-900">Device Status</TableHead>
                )}
                <TableHead className="font-semibold text-gray-900">Technician</TableHead>
                {isMyTasksTab ? (
                  <TableHead className="font-semibold text-gray-900">Task Urgency</TableHead>
                ) : isManagerView && !isCompletedTab ? (
                  <TableHead className="font-semibold text-gray-900">Task Urgency</TableHead>
                ) : (
                  <TableHead className="font-semibold text-gray-900">Payment</TableHead>
                )}
                {isMyTasksTab && (
                  <TableHead className="font-semibold text-gray-900">Total Cost</TableHead>
                )}
                {showActions && (
                  <TableHead className="font-semibold text-gray-900">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {effectiveFilteredTasks.map((task) => (
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
                  isMyTasksTab={isMyTasksTab}
                />
              ))}
            </TableBody>
          </Table>
          {effectiveFilteredTasks.length === 0 && (
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
