'use client'

import { TaskNotes } from "./task-notes";
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/layout/card"
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
  Trash2,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { updateTask, addTaskPayment, addTaskActivity } from "@/lib/api-client"

import { TaskActivityLog } from "./task-activity-log"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/layout/popover"
import { useTask, useTechnicians, useLocations, useTaskStatusOptions, useTaskUrgencyOptions, useBrands } from "@/hooks/use-data";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CostBreakdown } from "./cost-breakdown";
import { SimpleCombobox as Combobox } from "@/components/ui/core/combobox";
import { CurrencyInput } from "@/components/ui/core/currency-input";
import { AddExpenditureDialog } from "@/components/financials/add-expenditure-dialog";





interface TaskDetailsPageProps {
  taskId: string
}

export function TaskDetailsPage({ taskId }: TaskDetailsPageProps) {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient();

  const { data: taskData, isLoading, isError, error } = useTask(taskId);
  const { data: technicians } = useTechnicians();
  const { data: locations } = useLocations();
  const { data: statusOptions } = useTaskStatusOptions();
  const { data: urgencyOptions } = useTaskUrgencyOptions();
  const { data: brands } = useBrands();
  const { data: paymentMethods } = usePaymentMethods();
  const { toast } = useToast();

  const [newNote, setNewNote] = useState("")
  const [newPaymentAmount, setNewPaymentAmount] = useState<number | "">("")
  const [newPaymentMethod, setNewPaymentMethod] = useState("")
  const [isAddExpenditureOpen, setIsAddExpenditureOpen] = useState(false);

  const [isEditingLaptop, setIsEditingLaptop] = useState(false)



  const updateTaskMutation = useMutation({
    mutationFn: ({ field, value }: { field: string; value: any }) =>
      updateTask(taskId, { [field]: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const addTaskPaymentMutation = useMutation({
    mutationFn: (data: any) => addTaskPayment(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  // Role-based permissions
  const isAdmin = user?.role === "Administrator"
  const isManager = user?.role === "Manager"
  const isTechnician = user?.role === "Technician"
  const isFrontDesk = user?.role === "Front Desk"
  const isAccountant = user?.role === "Accountant"

  const canEditCustomer = isAdmin || isManager || isFrontDesk
  const canEditTechnician = isAdmin || isManager
  const canEditStatus = isAdmin || isTechnician;
  const canEditLocation = isAdmin || isManager;
  const canEditUrgency = isAdmin || isManager || isFrontDesk;
  const canEditFinancials = isAdmin || isManager || isAccountant
  const canMarkComplete = isAdmin || isTechnician
  const canMarkPickedUp = isAdmin || isFrontDesk

  const canEditEstimatedCost = isManager || (isTechnician && taskData && !taskData.assigned_to);


  const handleFieldUpdate = async (field: string, value: any) => {
    if (["name", "phone_numbers"].includes(field)) {
      updateTaskMutation.mutate({ field: "customer", value: { [field]: value } });
    } else {
      updateTaskMutation.mutate({ field, value });
    }
  }



  const handleAddPayment = async () => {
    if (!newPaymentAmount || !newPaymentMethod || !taskData) return

    const totalCost = parseFloat(taskData.total_cost || '0');
    const paidAmount = taskData.payments.reduce((acc: any, p: any) => acc + parseFloat(p.amount), 0);
    const remainingAmount = totalCost - paidAmount;
    
    if (parseFloat(newPaymentAmount.toString()) > remainingAmount) {
      toast({
        title: "Payment Exceeds Total Cost",
        description: "The payment amount cannot be more than the remaining amount.",
        variant: "destructive",
      });
      return;
    }

    addTaskPaymentMutation.mutate({ amount: newPaymentAmount, method: parseInt(newPaymentMethod, 10), date: new Date().toISOString().split('T')[0] });
    setNewPaymentAmount("")
    setNewPaymentMethod("")
  }

  const handleMarkAsDebt = () => {
    updateTaskMutation.mutate({ field: 'is_debt', value: true }, {
      onSuccess: () => {
        toast({ title: "Task Marked as Debt", description: `Task ${taskData?.title} has been marked as debt.` });
        addTaskActivity(taskId, { message: `Task marked as debt by ${user?.username}` });
      }
    });
  };

  const handleMarkAsPickedUp = () => {
    if (taskData?.payment_status !== 'Fully Paid' && !taskData?.is_debt) {
      toast({
        title: "Payment Required",
        description: "This task cannot be marked as picked up until it is fully paid. Please contact the manager for assistance.",
        variant: "destructive",
      });
      return;
    }
    updateTaskMutation.mutate({ field: 'status', value: 'Picked Up' });
  };

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
      case "rejected":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }



  if (isLoading) {
    return <div>Loading...</div>
  }

  if (isError) {
    return <div>Error: {error.message}</div>
  }

  if (!taskData) {
    return <div>Loading task details...</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header Section */}
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
          
          {isManager && taskData.payment_status !== 'Fully Paid' && (
            <Button 
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={handleMarkAsDebt}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Mark as Debt
            </Button>
          )}
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
              disabled={taskData.status !== 'Ready for Pickup' || (taskData.payment_status !== 'Fully Paid' && !taskData.is_debt)}
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100">
          <TabsTrigger value="overview" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="repair-management" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Repair Management
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            History
          </TabsTrigger>
          <TabsTrigger value="financials" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Financials
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

                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Customer Name</Label>
                    <Input
                      value={taskData.customer_details?.name || ''}
                      onChange={(e) => handleFieldUpdate("name", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Referred By</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{taskData.referred_by || "Not referred"}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Phone Numbers</Label>
                    {taskData.customer_details?.phone_numbers.map((phone, index) => (
                      <div key={index} className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <Input
                          value={phone.phone_number || ''}
                          onChange={(e) => {
                            const newPhoneNumbers = [...taskData.customer_details.phone_numbers];
                            newPhoneNumbers[index] = { ...newPhoneNumbers[index], phone_number: e.target.value };
                            handleFieldUpdate("phone_numbers", newPhoneNumbers);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPhoneNumbers = [...taskData.customer_details.phone_numbers];
                            newPhoneNumbers.splice(index, 1);
                            handleFieldUpdate("phone_numbers", newPhoneNumbers);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        const newPhoneNumbers = [...taskData.customer_details.phone_numbers, { phone_number: '' }];
                        handleFieldUpdate("phone_numbers", newPhoneNumbers);
                      }}
                    >
                      Add Phone Number
                    </Button>
                      </div>

                </div>
              </CardContent>
            </Card>

            {/* Laptop Information */}
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Laptop className="h-5 w-5 text-red-600" />
                    Laptop Information
                  </CardTitle>
                  {(isAdmin || isManager) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingLaptop(!isEditingLaptop)}
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
                    <Label className="text-sm font-medium text-gray-600">Make & Model</Label>
                    {isEditingLaptop ? (
                      <div className="flex gap-2">
                        <Select
                          value={taskData.brand?.toString() || ''}
                          onValueChange={(value) => handleFieldUpdate("brand", parseInt(value, 10))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a brand" />
                          </SelectTrigger>
                          <SelectContent>
                            {brands?.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id.toString()}>
                                {brand.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={taskData.laptop_model || ''}
                          onChange={(e) => handleFieldUpdate("laptop_model", e.target.value)}
                          className="mt-1"
                          placeholder="Model"
                        />
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <p className="text-gray-900 font-medium">
                          {taskData.brand_details?.name || "N/A"}
                        </p>
                        <p className="text-gray-900 font-medium">
                          {taskData.laptop_model || "N/A"}
                        </p>
                      </div>
                    )}
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
                      {isEditingLaptop && isManager ? (
                        <Input
                          value={taskData.negotiated_by_details?.full_name || ''}
                          onChange={(e) => handleFieldUpdate("negotiated_by", e.target.value)}
                          className="mt-1"
                        />
                      ) : (
                        <span className="text-gray-900">{taskData.negotiated_by_details?.full_name || taskData.created_by_details?.full_name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
            {/* Returned Issue Descriptions */}
            {taskData.activities?.filter((activity: any) => activity.message.startsWith('Returned with new issue:')).length > 0 && (
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-900">Returned Issue Descriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {taskData.activities
                      .filter((activity: any) => activity.message.startsWith('Returned with new issue:'))
                      .map((activity: any) => (
                        <div key={activity.id} className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <p className="text-gray-900 leading-relaxed">{activity.message.replace('Returned with new issue: ', '')}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Reported by {activity.user?.full_name || 'System'} on {new Date(activity.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>



        {/* Repair Management Tab */}
        <TabsContent value="repair-management" className="space-y-6">
          <div className="grid gap-6">
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
                        value={taskData.assigned_to?.toString() || ''}
                        onValueChange={(value) => handleFieldUpdate("assigned_to", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {technicians?.map((tech) => (
                            <SelectItem key={tech.id} value={tech.id.toString()}>
                              {tech.full_name}
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
                        value={taskData.status || ''}
                        onValueChange={(value) => handleFieldUpdate("status", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions?.map((status) => (
                            <SelectItem key={status[0]} value={status[0]}>
                              {status[1]}
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
                    {canEditLocation ? (
                      <Select
                        value={taskData.current_location || ''}
                        onValueChange={(value) => handleFieldUpdate("current_location", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {locations?.map((location) => (
                            <SelectItem key={location.id} value={location.name}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-900 p-2 bg-gray-50 rounded border">{taskData.current_location}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-600">Urgency Level</Label>
                    <Select value={taskData.urgency || ''} onValueChange={(value) => handleFieldUpdate("urgency", value)} disabled={!canEditUrgency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {urgencyOptions?.map((priority) => (
                          <SelectItem key={priority[0]} value={priority[0]}>
                            {priority[1]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            <TaskNotes taskId={taskId} />
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1">
          <TaskActivityLog taskId={taskId} />
          </div>
          </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1">

            <CostBreakdown task={taskData} />


          </div>

          {/* Payment History */}
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-900">Payment History</CardTitle>
                {canEditFinancials && (
                  <div className="flex items-center gap-2">
                    <CurrencyInput
                      placeholder="Amount"
                      value={newPaymentAmount}
                      onValueChange={(value) => setNewPaymentAmount(value || "")}
                      className="w-24"
                    />
                    <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods?.map((method) => (
                          <SelectItem key={method.id} value={String(method.id)}>
                            {method.name}
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
                    {(isAccountant) && (<Button
                        onClick={() => setIsAddExpenditureOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Refund
                      </Button>)}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskData.payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium text-green-600">TSh {parseFloat(payment.amount).toFixed(2)}</TableCell>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>{payment.method_name}</TableCell>
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
      </Tabs>
            <AddExpenditureDialog
        isOpen={isAddExpenditureOpen}
        onClose={() => setIsAddExpenditureOpen(false)}
        mode="refund"
        taskId={taskId}
        taskTitle={taskData.title}
      />
    </div>
  )
}