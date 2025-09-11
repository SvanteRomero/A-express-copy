"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Label } from "@/components/ui/core/label"
import { Textarea } from "@/components/ui/core/textarea"
import { Badge } from "@/components/ui/core/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import {
  ArrowLeft,
  User,
  Laptop,
  ClipboardList,
  DollarSign,
  Calendar,
  Settings,
  Edit,
  Plus,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  CreditCard,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getTask, updateTask, addTaskActivity, addTaskPayment } from "@/lib/api-client"

const statusOptions = [
  "Assigned - Not Accepted",
  "Diagnostic",
  "In Progress",
  "Awaiting Parts",
  "Ready for QC",
  "Ready for Pickup",
  "Completed",
  "Cancelled",
]

const locationOptions = [
  "Front Desk Intake",
  "Diagnostic Station",
  "Repair Bay 1",
  "Repair Bay 2",
  "Parts Storage",
  "Quality Control",
  "Front Desk",
]

const technicianOptions = ["John Smith", "Sarah Johnson", "Mike Chen", "Lisa Brown", "David Wilson"]

const urgencyOptions = ["Low", "Medium", "High"]

const paymentStatusOptions = ["Unpaid", "Partially Paid", "Paid", "Refunded"]

const paymentMethodOptions = ["Cash", "Credit Card", "Debit Card", "Check", "Digital Payment"]

interface TaskDetailsPageProps {
  taskId: string
}

export function TaskDetailsPage({ taskId }: TaskDetailsPageProps) {
  const { user } = useAuth()
  const [taskData, setTaskData] = useState<any>(null)
  const [newNote, setNewNote] = useState("")
  const [newPaymentAmount, setNewPaymentAmount] = useState("")
  const [newPaymentMethod, setNewPaymentMethod] = useState("")
  const [isEditingCustomer, setIsEditingCustomer] = useState(false)

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await getTask(taskId)
        setTaskData(response.data)
      } catch (error) {
        console.error(`Error fetching task ${taskId}:`, error)
      }
    }
    fetchTask()
  }, [taskId])

  // Role-based permissions
  const isAdmin = user?.role === "Administrator"
  const isManager = user?.role === "Manager"
  const isTechnician = user?.role === "Technician"
  const isFrontDesk = user?.role === "Front Desk"

  const canEditCustomer = isAdmin || isFrontDesk
  const canEditTechnician = isAdmin || isManager
  const canEditStatus = isAdmin || isTechnician
  const canEditFinancials = isAdmin || isManager
  const canMarkComplete = isAdmin || isTechnician
  const canMarkPickedUp = isAdmin || isFrontDesk

  const handleFieldUpdate = async (field: string, value: string | number) => {
    if (!taskData) return

    const updatedTask = { ...taskData, [field]: value }
    setTaskData(updatedTask)

    try {
      await updateTask(taskData.id, { [field]: value })
    } catch (error) {
      console.error(`Error updating task ${taskData.id}:`, error)
      // Optionally revert the change in UI
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !taskData) return

    try {
      const response = await addTaskActivity(taskData.id, { message: newNote, type: 'note' })
      setTaskData({ ...taskData, activities: [...taskData.activities, response.data] })
      setNewNote("")
    } catch (error) {
      console.error("Error adding note:", error)
    }
  }

  const handleAddPayment = async () => {
    if (!newPaymentAmount || !newPaymentMethod || !taskData) return

    try {
      const response = await addTaskPayment(taskData.id, { amount: newPaymentAmount, method: newPaymentMethod })
      const newPayment = response.data
      const updatedPayments = [...taskData.payments, newPayment]
      const totalPaid = updatedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)

      let paymentStatus = "Partially Paid"
      if (totalPaid >= parseFloat(taskData.total_cost)) {
        paymentStatus = "Paid"
      }

      const updatedTask = { ...taskData, payments: updatedPayments, payment_status: paymentStatus }
      setTaskData(updatedTask)
      await updateTask(taskData.id, { payment_status: paymentStatus })

      setNewPaymentAmount("")
      setNewPaymentMethod("")
    } catch (error) {
      console.error("Error adding payment:", error)
    }
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
      case "Ready for QC":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Ready for QC</Badge>
      case "Ready for Pickup":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ready for Pickup</Badge>
      case "Completed":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Completed</Badge>
      case "Cancelled":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "High":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">High</Badge>
      case "Medium":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>
      case "Low":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Low</Badge>
      default:
        return <Badge variant="secondary">{urgency}</Badge>
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "status_update":
        return <Settings className="h-4 w-4 text-blue-600" />
      case "note":
        return <MessageSquare className="h-4 w-4 text-gray-600" />
      case "diagnosis":
        return <ClipboardList className="h-4 w-4 text-purple-600" />
      case "customer_contact":
        return <Phone className="h-4 w-4 text-green-600" />
      case "intake":
        return <Plus className="h-4 w-4 text-orange-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  if (!taskData) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-red-600">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Task Details - {taskData.id}</h1>
          <p className="text-gray-600 mt-2">Complete information and management for this repair task</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(taskData.status)}
          {getUrgencyBadge(taskData.urgency)}
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-gray-100">
          <TabsTrigger value="overview" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="repair" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Repair Details
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Activity Log
          </TabsTrigger>
          <TabsTrigger value="financials" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Financials
          </TabsTrigger>
          <TabsTrigger value="timeline" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Customer Information */}
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-red-600" />
                    Customer Information
                  </CardTitle>
                  {canEditCustomer && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                      className="border-gray-300 text-gray-600 bg-transparent"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Customer Name</Label>
                    {isEditingCustomer ? (
                      <Input
                        value={taskData.customer_name}
                        onChange={(e) => handleFieldUpdate("customer_name", e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{taskData.customer_name}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Phone Number</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {isEditingCustomer ? (
                        <Input
                          value={taskData.customer_phone}
                          onChange={(e) => handleFieldUpdate("customer_phone", e.target.value)}
                        />
                      ) : (
                        <span className="text-gray-900">{taskData.customer_phone}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Email Address</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {isEditingCustomer ? (
                        <Input
                          value={taskData.customer_email}
                          onChange={(e) => handleFieldUpdate("customer_email", e.target.value)}
                        />
                      ) : (
                        <span className="text-gray-900">{taskData.customer_email}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Laptop Information */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Laptop className="h-5 w-5 text-red-600" />
                  Laptop Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Make & Model</Label>
                    <p className="text-gray-900 font-medium">
                      {taskData.laptop_make} {taskData.laptop_model}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Serial Number</Label>
                    <p className="text-gray-900 font-mono text-sm bg-gray-50 p-2 rounded border">
                      {taskData.serial_number}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Current Location</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{taskData.current_location}</span>
                    </div>
                  </div>
                   <div>
                    <Label className="text-sm font-medium text-gray-600">Negotiated By</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{taskData.negotiated_by_details?.full_name}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Repair Details Tab */}
        <TabsContent value="repair" className="space-y-6">
          <div className="grid gap-6">
            {/* Initial Issue */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Initial Issue Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-gray-900 leading-relaxed">{taskData.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Repair Management */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Repair Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Assigned Technician</Label>
                    {canEditTechnician ? (
                      <Select
                        value={taskData.assigned_to}
                        onValueChange={(value) => handleFieldUpdate("assigned_to", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {technicianOptions.map((tech) => (
                            <SelectItem key={tech} value={tech}>
                              {tech}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-900 p-2 bg-gray-50 rounded border">{taskData.assigned_to_details?.full_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Current Status</Label>
                    {canEditStatus ? (
                      <Select
                        value={taskData.status}
                        onValueChange={(value) => handleFieldUpdate("status", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-2">{getStatusBadge(taskData.status)}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Current Location</Label>
                    <Select
                      value={taskData.current_location}
                      onValueChange={(value) => handleFieldUpdate("current_location", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locationOptions.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Urgency Level</Label>
                    <Select value={taskData.urgency} onValueChange={(value) => handleFieldUpdate("urgency", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {urgencyOptions.map((urgency) => (
                          <SelectItem key={urgency} value={urgency}>
                            {urgency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Activity & Notes Log</CardTitle>
              <CardDescription>Chronological record of all task activities and notes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Note Section */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                <Label className="text-sm font-medium text-gray-700">Add New Note</Label>
                <Textarea
                  placeholder="Enter your note, diagnosis, repair step, or communication details..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>

              {/* Activity Log */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {taskData.activities.map((activity: any) => (
                  <div key={activity.id} className="flex gap-4 p-4 bg-white border rounded-lg">
                    <div className="flex-shrink-0 p-2 bg-gray-100 rounded-full">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{activity.user.full_name}</span>
                        <span className="text-sm text-gray-500">{new Date(activity.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{activity.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cost Breakdown */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-red-600" />
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium text-gray-600">Parts Cost</Label>
                    {canEditFinancials ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={taskData.parts_cost}
                        onChange={(e) => handleFieldUpdate("parts_cost", Number.parseFloat(e.target.value))}
                        className="w-24 text-right"
                      />
                    ) : (
                      <span className="font-medium text-gray-900">${parseFloat(taskData.parts_cost).toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium text-gray-600">Labor Cost</Label>
                    {canEditFinancials ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={taskData.labor_cost}
                        onChange={(e) => handleFieldUpdate("labor_cost", Number.parseFloat(e.target.value))}
                        className="w-24 text-right"
                      />
                    ) : (
                      <span className="font-medium text-gray-900">${parseFloat(taskData.labor_cost).toFixed(2)}</span>
                    )}
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-base font-semibold text-gray-900">Total Cost</Label>
                      <span className="text-xl font-bold text-red-600">${parseFloat(taskData.total_cost).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Status */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-red-600" />
                  Payment Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Payment Status</Label>
                    {canEditFinancials ? (
                      <Select
                        value={taskData.payment_status}
                        onValueChange={(value) => handleFieldUpdate("payment_status", value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentStatusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-900 font-medium mt-1">{taskData.payment_status}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Paid Date</Label>
                    <p className="text-gray-900 mt-1">{taskData.paid_date || "Not paid"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-900">Payment History</CardTitle>
                {canEditFinancials && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={newPaymentAmount}
                      onChange={(e) => setNewPaymentAmount(e.target.value)}
                      className="w-24"
                    />
                    <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethodOptions.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAddPayment}
                      disabled={!newPaymentAmount || !newPaymentMethod}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Payment
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskData.payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium text-green-600">${parseFloat(payment.amount).toFixed(2)}</TableCell>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell className="font-mono text-sm">{payment.reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {taskData.payments.length === 0 && (
                <div className="text-center py-8 text-gray-500">No payments recorded yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-red-600" />
                Dates & Milestones
              </CardTitle>
              <CardDescription>Key dates and milestones for this repair task</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Date In</Label>
                      <p className="text-gray-900 font-medium">{taskData.date_in}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Approved Date</Label>
                      <p className="text-gray-900 font-medium">{taskData.approved_date || "Not approved"}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Paid Date</Label>
                      <p className="text-gray-900 font-medium">{taskData.paid_date || "Not paid"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <Clock className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Date Out</Label>
                      <p className="text-gray-900 font-medium">{taskData.date_out || "Not completed"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <div className="flex items-center gap-3">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Mail className="h-4 w-4 mr-2" />
                Send Customer Update
              </Button>
              {canMarkComplete && (
                <Button className="bg-red-600 hover:bg-red-700 text-white">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Complete
                </Button>
              )}
              {canMarkPickedUp && (
                <Button className="bg-red-600 hover:bg-red-700 text-white">
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
        </CardContent>
      </Card>
    </div>
  )
}
