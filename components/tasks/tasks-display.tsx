'use client'

import { useState, useMemo, useEffect, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Badge } from "@/components/ui/core/badge"
import { Button } from "@/components/ui/core/button"
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User as UserIcon,
  Laptop,
  Package,
  Edit,
  Trash2,
  AlertTriangle,
  Calendar,
  MapPin,
  MessageSquare,
  CheckCircle,
} from "lucide-react"
import {  AlertDialog,  AlertDialogAction,  AlertDialogCancel,  AlertDialogContent,  AlertDialogDescription,  AlertDialogFooter,  AlertDialogHeader,  AlertDialogTitle,  AlertDialogTrigger,} from "@/components/ui/feedback/alert-dialog"
import { TaskFilters } from "./task-filters"
import { getTaskStatusOptions } from "@/lib/tasks-api";


import { Textarea } from "@/components/ui/core/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/feedback/dialog";
import AddPaymentDialog from "./add-payment-dialog";

interface TasksDisplayProps {
  tasks: any[];
  technicians: any[];
  onRowClick: (task: any) => void;
  showActions: boolean;
  onDeleteTask?: (taskTitle: string) => void;
  onProcessPickup?: (taskTitle: string) => void;
  onApprove?: (taskTitle: string) => void;
  onReject?: (taskTitle: string, notes: string) => void;
  isCompletedTab?: boolean;

  onTerminateTask?: (taskTitle: string) => void;
  isManagerView?: boolean;
  isFrontDeskCompletedView?: boolean;
  isPickupView?: boolean;
  onPickedUp?: (taskTitle: string) => void;
  onNotifyCustomer?: (taskTitle: string, customerName: string) => void;
  isHistoryView?: boolean;
  onReturnTask?: (task: any) => void;
  isAccountantView?: boolean;
  onAddPayment?: (taskId: string, amount: number, paymentMethodId: number) => void;
  onRemindDebt?: (taskId: string) => void;
}

export function TasksDisplay({ tasks, technicians, onRowClick, showActions, onDeleteTask, onProcessPickup, onApprove, onReject, isCompletedTab, onTerminateTask, isManagerView, isFrontDeskCompletedView, isPickupView, onPickedUp, onNotifyCustomer, isHistoryView, onReturnTask, isAccountantView, onAddPayment, onRemindDebt }: TasksDisplayProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [technicianFilter, setTechnicianFilter] = useState<string>("all")
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [isPaidConfirmOpen, setIsPaidConfirmOpen] = useState(false);
  const [taskToPay, setTaskToPay] = useState<any | null>(null);
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  const [selectedTaskToPay, setSelectedTaskToPay] = useState<any | null>(null);

  useEffect(() => {
    const fetchStatusOptions = async () => {
      try {
        const response = await getTaskStatusOptions();
        setStatusOptions((response.data || []).map((option: any) => option[0]));
      } catch (error) {
        console.error("Error fetching status options:", error);
      }
    };
    fetchStatusOptions();
  }, []);
  const uniqueTechnicians = useMemo(() => {
    return technicians.map((tech) => ({ id: tech.id, full_name: `${tech.first_name} ${tech.last_name}`.trim() }))
  }, [technicians])
  const uniqueUrgencies = useMemo(() => [...new Set(tasks.map((task) => task?.urgency || "").filter((urgency) => urgency))], [tasks])
  const uniqueLocations = useMemo(() => [...new Set(tasks.map((task) => task?.current_location || "").filter((location) => location))], [tasks])

  const filteredAndSortedTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const matchesSearch =
        searchQuery === "" ||
        task.title.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.customer_details?.name && task.customer_details.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.customer_details?.phone_numbers && task.customer_details.phone_numbers.some((p: any) => p.phone_number.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        task.laptop_model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesTechnician = technicianFilter === "all" || task.assigned_to_details?.full_name === technicianFilter
      const matchesUrgency = urgencyFilter === "all" || task.urgency === urgencyFilter
      const matchesLocation = locationFilter === "all" || task.current_location === locationFilter

      return matchesSearch && matchesStatus && matchesTechnician && matchesUrgency && matchesLocation
    })

    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        const aValue = a[sortField]
        const bValue = b[sortField]

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [searchQuery, statusFilter, technicianFilter, urgencyFilter, locationFilter, sortField, sortDirection, tasks])

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortField(null)
        setSortDirection(null)
      } else {
        setSortDirection("asc")
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4" />
    if (sortDirection === "desc") return <ArrowDown className="h-4 w-4" />
    return <ArrowUpDown className="h-4 w-4" />
  }

  const getStatusBadge = useCallback((status: string) => {
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
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }, [])

  const getUrgencyBadge = useCallback((urgency: string) => {
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
  }, [])

  const getPaymentStatusBadge = useCallback((status: string) => {
    switch (status) {
      case "Fully Paid":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Fully Paid</Badge>
      case "Partially Paid":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partially Paid</Badge>
      case "Unpaid":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Unpaid</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }, [])

  const clearAllFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setTechnicianFilter("all")
    setUrgencyFilter("all")
    setLocationFilter("all")
    setSortField(null)
    setSortDirection(null)
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
              <TableHead className="font-semibold text-gray-900">Payment</TableHead>
              {showActions && (
                <TableHead className="font-semibold text-gray-900">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedTasks.map((task) => (
              <TableRow
                key={task.id}
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
                    <span className="text-gray-900">{task.laptop_model}</span>
                  </div>
                </TableCell>
                {isManagerView ? (
                  <TableCell className="text-gray-600 max-w-xs truncate">
                    {task.current_location}
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
                  {task.workshop_status === 'In Workshop' ? (
                    <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-100">
                      In Workshop
                    </Badge>
                  ) : (
                    getStatusBadge(task.status)
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">
                      {task.assigned_to_details?.full_name || "Unassigned"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{getPaymentStatusBadge(task.payment_status)}</TableCell>
                {showActions && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {isHistoryView && task.status === 'Picked Up' && new Date(task.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReturnTask?.(task);
                          }}
                        >
                          Return
                        </Button>
                      ) : isPickupView ? (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={(e) => e.stopPropagation()}
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
                            className="border-gray-300 text-gray-600 hover:bg-gray-50 bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNotifyCustomer?.(task.title, task.customer_details?.name);
                            }}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Notify Customer
                          </Button>
                        </>
                      ) : isFrontDeskCompletedView ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApprove?.(task.title);
                            }}
                          >
                            Approve
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTask(task);
                                }}
                              >
                                Reject
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reject Task {selectedTask?.title}</DialogTitle>
                              </DialogHeader>
                              <Textarea
                                placeholder="Enter rejection notes..."
                                value={rejectionNotes}
                                onChange={(e) => setRejectionNotes(e.target.value)}
                              />
                              <DialogFooter>
                                <Button
                                  onClick={() => {
                                    onReject?.(selectedTask?.title, rejectionNotes);
                                    setSelectedTask(null);
                                    setRejectionNotes("");
                                  }}
                                >
                                  Confirm
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      ) : isAccountantView ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTaskToPay(task);
                              setIsAddPaymentDialogOpen(true);
                            }}
                          >
                            Add Payment
                          </Button>
                          {onRemindDebt && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemindDebt(task.title);
                              }}
                            >
                              Remind Debt
                            </Button>
                          )}
                        </>
                      ) : isCompletedTab ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add notification logic here in the future
                            }}
                          >
                            Notify Customer
                          </Button>
                          {isHistoryView && task.status === 'Picked Up' && new Date(task.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReturnTask?.(task);
                              }}
                            >
                              Return
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {["Pending", "In Progress"].includes(task.status) ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
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
                                  <AlertDialogAction
                                    onClick={() => onTerminateTask?.(task.title)}
                                  >
                                    Terminate
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-300 text-gray-600 hover:bg-gray-50 bg-transparent"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRowClick(task);
                                }}
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
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
                                      <AlertDialogAction
                                        onClick={() => onDeleteTask(task.title)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
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

      {selectedTaskToPay && (
        <AddPaymentDialog
          isOpen={isAddPaymentDialogOpen}
          onClose={() => {
            setIsAddPaymentDialogOpen(false);
            setSelectedTaskToPay(null);
          }}
          onSubmit={(amount, methodId) => {
            onAddPayment?.(selectedTaskToPay.title, amount, methodId);
            setIsAddPaymentDialogOpen(false);
            setSelectedTaskToPay(null);
          }}
          taskTitle={selectedTaskToPay.title}
          outstandingBalance={selectedTaskToPay.outstanding_balance}
        />
      )}

    </div>
  )
}
