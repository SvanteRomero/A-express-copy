"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Badge } from "@/components/ui/core/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs"
import { Label } from "@/components/ui/core/label"
import { Textarea } from "@/components/ui/core/textarea"
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  AlertTriangle,
  Laptop,
  Phone,
  Mail,
  DollarSign,
  Package,
  CheckCircle,
  Edit,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getTasks, createTask, updateTask } from "@/lib/api-client"

type SortField = any
type SortDirection = "asc" | "desc" | null

interface NewTaskForm {
  customer_name: string
  customer_phone: string
  customer_email: string
  laptop_make: string
  laptop_model: string
  serial_number: string
  description: string
  urgency: string
  assigned_to: string
  estimated_cost: string
}

export function ManagerTasksPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("list")
  const [tasks, setTasks] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [technicianFilter, setTechnicianFilter] = useState<string>("all")
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [isEditingCustomer, setIsEditingCustomer] = useState(false)

  // New task form state
  const [newTaskForm, setNewTaskForm] = useState<NewTaskForm>({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    laptop_make: "",
    laptop_model: "",
    serial_number: "",
    description: "",
    urgency: "Medium",
    assigned_to: "",
    estimated_cost: "",
  })

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await getTasks()
        setTasks(response.data)
      } catch (error) {
        console.error("Error fetching tasks:", error)
      }
    }
    fetchTasks()
  }, [])

  // Get unique values for filter dropdowns
  const uniqueStatuses = [...new Set(tasks.map((task) => task.status))]
  const uniqueTechnicians = [...new Set(tasks.map((task) => task.assigned_to_details?.full_name).filter(Boolean))]
  const uniqueUrgencies = [...new Set(tasks.map((task) => task.urgency))]
  const uniqueLocations = [...new Set(tasks.map((task) => task.current_location))]

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const matchesSearch =
        searchQuery === "" ||
        task.id.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.laptop_model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesTechnician = technicianFilter === "all" || task.assigned_to_details?.full_name === technicianFilter
      const matchesUrgency = urgencyFilter === "all" || task.urgency === urgencyFilter
      const matchesLocation = locationFilter === "all" || task.current_location === locationFilter

      return matchesSearch && matchesStatus && matchesTechnician && matchesUrgency && matchesLocation
    })

    // Sort tasks
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

  const handleSort = (field: SortField) => {
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4" />
    if (sortDirection === "desc") return <ArrowDown className="h-4 w-4" />
    return <ArrowUpDown className="h-4 w-4" />
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

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
      case "Partially Paid":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partially Paid</Badge>
      case "Unpaid":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Unpaid</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleRowClick = (task: any) => {
    setSelectedTask(task)
    setActiveTab("details")
  }

  const handleCreateTask = async () => {
    try {
      const response = await createTask(newTaskForm)
      setTasks((prev) => [response.data, ...prev])
      setNewTaskForm({
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        laptop_make: "",
        laptop_model: "",
        serial_number: "",
        description: "",
        urgency: "Medium",
        assigned_to: "",
        estimated_cost: "",
      })
      setActiveTab("list")
    } catch (error) {
      console.error("Error creating task:", error)
    }
  }

  const handleUpdateTask = async (field: string, value: any) => {
    if (!selectedTask) return

    const updatedTask = { ...selectedTask, [field]: value }
    setSelectedTask(updatedTask)

    try {
      await updateTask(selectedTask.id, { [field]: value })
      setTasks((prev) => prev.map((task) => (task.id === selectedTask.id ? updatedTask : task)))
    } catch (error) {
      console.error(`Error updating task ${selectedTask.id}:`, error)
    }
  }

  const handleProcessPickup = (taskId: string) => {
    handleUpdateTask("status", "Completed")
    handleUpdateTask("current_location", "Completed")
    handleUpdateTask("payment_status", "Paid")
    alert("Pickup processed successfully!")
  }

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
    <div className="flex-1 space-y-6 p-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manager Tasks Portal</h1>
        <p className="text-gray-600 mt-2">Complete task management with Front Desk workflow capabilities</p>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="list" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Tasks List
          </TabsTrigger>
          <TabsTrigger value="create" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            New Task
          </TabsTrigger>
          <TabsTrigger value="details" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Task Details
          </TabsTrigger>
        </TabsList>

        {/* Tasks List Tab */}
        <TabsContent value="list" className="space-y-6">
          {/* Search and Filters */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-600" />
                Search & Filters
              </CardTitle>
              <CardDescription>Use the search bar and filters to find specific tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by Task ID, Customer Name, Laptop Model, or Issue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base border-gray-300 focus:border-red-500 focus:ring-red-500"
                />
              </div>

              {/* Filter Dropdowns */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Technicians" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Technicians</SelectItem>
                    {uniqueTechnicians.map((technician) => (
                      <SelectItem key={technician} value={technician}>
                        {technician}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Urgencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Urgencies</SelectItem>
                    {uniqueUrgencies.map((urgency) => (
                      <SelectItem key={urgency} value={urgency}>
                        {urgency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueLocations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="border-gray-300 text-gray-600 bg-transparent"
                >
                  Clear Filters
                </Button>
              </div>

              {/* Results Summary */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {filteredAndSortedTasks.length} of {tasks.length} tasks
                </span>
                {(searchQuery ||
                  statusFilter !== "all" ||
                  technicianFilter !== "all" ||
                  urgencyFilter !== "all" ||
                  locationFilter !== "all") && <span className="text-red-600">Filters active</span>}
              </div>
            </CardContent>
          </Card>

          {/* Tasks Table */}
          <Card className="border-gray-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("id")}
                          className="h-auto p-0 font-semibold text-gray-900 hover:text-red-600"
                        >
                          Task ID {getSortIcon("id")}
                        </Button>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("customer_name")}
                          className="h-auto p-0 font-semibold text-gray-900 hover:text-red-600"
                        >
                          Customer {getSortIcon("customer_name")}
                        </Button>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">Device</TableHead>
                      <TableHead className="font-semibold text-gray-900">Issue</TableHead>
                      <TableHead className="font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900">Technician</TableHead>
                      <TableHead className="font-semibold text-gray-900">Payment</TableHead>
                      <TableHead className="font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedTasks.map((task) => (
                      <TableRow
                        key={task.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(task)}
                      >
                        <TableCell className="font-medium text-red-600">{task.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{task.customer_name}</p>
                            <p className="text-sm text-gray-500">{task.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Laptop className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900">{task.laptop_model}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 max-w-xs truncate">{task.description}</TableCell>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900">{task.assigned_to_details?.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(task.payment_status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {task.status === "Ready for Pickup" && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleProcessPickup(task.id)
                                }}
                              >
                                <Package className="h-3 w-3 mr-1" />
                                Pickup
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-300 text-gray-600 hover:bg-gray-50 bg-transparent"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRowClick(task)
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredAndSortedTasks.length === 0 && (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                  <p className="text-gray-600">Try adjusting your search criteria or filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Task Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-red-600" />
                Create New Repair Task
              </CardTitle>
              <CardDescription>Enter customer and device information to create a new repair task</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-red-600" />
                    Customer Information
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer_name">Customer Name *</Label>
                      <Input
                        id="customer_name"
                        value={newTaskForm.customer_name}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, customer_name: e.target.value })}
                        placeholder="Enter customer full name"
                        className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer_phone">Phone Number *</Label>
                      <Input
                        id="customer_phone"
                        value={newTaskForm.customer_phone}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, customer_phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer_email">Email Address</Label>
                      <Input
                        id="customer_email"
                        type="email"
                        value={newTaskForm.customer_email}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, customer_email: e.target.value })}
                        placeholder="customer@email.com"
                        className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Device Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Laptop className="h-5 w-5 text-red-600" />
                    Device Information
                  </h3>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="laptop_make">Make *</Label>
                        <Input
                          id="laptop_make"
                          value={newTaskForm.laptop_make}
                          onChange={(e) => setNewTaskForm({ ...newTaskForm, laptop_make: e.target.value })}
                          placeholder="e.g., Apple, Dell, HP"
                          className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="laptop_model">Model *</Label>
                        <Input
                          id="laptop_model"
                          value={newTaskForm.laptop_model}
                          onChange={(e) => setNewTaskForm({ ...newTaskForm, laptop_model: e.target.value })}
                          placeholder='e.g., MacBook Pro 13"'
                          className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serial_number">Serial Number *</Label>
                      <Input
                        id="serial_number"
                        value={newTaskForm.serial_number}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, serial_number: e.target.value })}
                        placeholder="Enter device serial number"
                        className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assigned_to">Assigned Technician</Label>
                      <Select
                        value={newTaskForm.assigned_to}
                        onValueChange={(value) => setNewTaskForm({ ...newTaskForm, assigned_to: value })}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-red-500 focus:ring-red-500">
                          <SelectValue placeholder="Select technician" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueTechnicians.map((technician) => (
                            <SelectItem key={technician} value={technician}>
                              {technician}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Issue Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Issue Details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="urgency">Urgency Level</Label>
                    <Select
                      value={newTaskForm.urgency}
                      onValueChange={(value) => setNewTaskForm({ ...newTaskForm, urgency: value })}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-red-500 focus:ring-red-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low Priority</SelectItem>
                        <SelectItem value="Medium">Medium Priority</SelectItem>
                        <SelectItem value="High">High Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated_cost">Estimated Cost</Label>
                    <Input
                      id="estimated_cost"
                      type="number"
                      step="0.01"
                      value={newTaskForm.estimated_cost}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, estimated_cost: e.target.value })}
                      placeholder="0.00"
                      className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Issue Description *</Label>
                  <Textarea
                    id="description"
                    value={newTaskForm.description}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                    placeholder="Describe the problem in detail..."
                    rows={4}
                    className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4 pt-6">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("list")}
                  className="border-gray-300 text-gray-700 bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTask}
                  disabled={
                    !newTaskForm.customer_name ||
                    !newTaskForm.customer_phone ||
                    !newTaskForm.laptop_make ||
                    !newTaskForm.laptop_model ||
                    !newTaskForm.serial_number ||
                    !newTaskForm.description
                  }
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Task Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {selectedTask ? (
            <div className="grid gap-6">
              {/* Task Header */}
              <Card className="border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900">
                        Task Details - {selectedTask.id}
                      </CardTitle>
                      <CardDescription>Complete task information and management</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedTask.status)}
                      {getUrgencyBadge(selectedTask.urgency)}
                      {getPaymentStatusBadge(selectedTask.payment_status)}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Customer Information */}
                <Card className="border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <User className="h-5 w-5 text-red-600" />
                        Customer Information
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                        className="border-gray-300 text-gray-600 bg-transparent"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        {isEditingCustomer ? "Save" : "Edit"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Customer Name</Label>
                        {isEditingCustomer ? (
                          <Input
                            value={selectedTask.customer_name}
                            onChange={(e) => handleUpdateTask("customer_name", e.target.value)}
                            className="mt-1"
                          />
                        ) : (
                          <p className="text-gray-900 font-medium mt-1">{selectedTask.customer_name}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Phone Number</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {isEditingCustomer ? (
                            <Input
                              value={selectedTask.customer_phone}
                              onChange={(e) => handleUpdateTask("customer_phone", e.target.value)}
                            />
                          ) : (
                            <span className="text-gray-900">{selectedTask.customer_phone}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Email Address</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {isEditingCustomer ? (
                            <Input
                              value={selectedTask.customer_email}
                              onChange={(e) => handleUpdateTask("customer_email", e.target.value)}
                            />
                          ) : (
                            <span className="text-gray-900">{selectedTask.customer_email}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Device & Payment Information */}
                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Laptop className="h-5 w-5 text-red-600" />
                      Device & Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Device</Label>
                        <p className="text-gray-900 font-medium mt-1">{selectedTask.laptop_model}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Serial Number</Label>
                        <p className="text-gray-900 font-mono text-sm bg-gray-50 p-2 rounded border mt-1">
                          {selectedTask.serial_number}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Total Cost</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            step="0.01"
                            value={selectedTask.total_cost}
                            onChange={(e) => handleUpdateTask("total_cost", Number.parseFloat(e.target.value))}
                            className="w-32"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Payment Status</Label>
                        <Select
                          value={selectedTask.payment_status}
                          onValueChange={(value) => handleUpdateTask("payment_status", value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unpaid">Unpaid</SelectItem>
                            <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Task Management */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Task Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">Current Status</Label>
                      <Select
                        value={selectedTask.status}
                        onValueChange={(value) => handleUpdateTask("status", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Assigned - Not Accepted">Not Accepted</SelectItem>
                          <SelectItem value="Diagnostic">Diagnostic</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Awaiting Parts">Awaiting Parts</SelectItem>
                          <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">Assigned Technician</Label>
                      <Select
                        value={selectedTask.assigned_to}
                        onValueChange={(value) => handleUpdateTask("assigned_to", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueTechnicians.map((technician) => (
                            <SelectItem key={technician} value={technician}>
                              {technician}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">Current Location</Label>
                      <Select
                        value={selectedTask.current_location}
                        onValueChange={(value) => handleUpdateTask("current_location", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Front Desk Intake">Front Desk Intake</SelectItem>
                          <SelectItem value="Diagnostic Station">Diagnostic Station</SelectItem>
                          <SelectItem value="Repair Bay 1">Repair Bay 1</SelectItem>
                          <SelectItem value="Repair Bay 2">Repair Bay 2</SelectItem>
                          <SelectItem value="Parts Storage">Parts Storage</SelectItem>
                          <SelectItem value="Quality Control">Quality Control</SelectItem>
                          <SelectItem value="Front Desk">Front Desk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Issue Description */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Issue Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <p className="text-gray-900 leading-relaxed">{selectedTask.description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                    <div className="flex items-center gap-3">
                      <Button className="bg-red-600 hover:bg-red-700 text-white">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Customer Update
                      </Button>
                      {selectedTask.status === "Ready for Pickup" && (
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleProcessPickup(selectedTask.id)}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Process Pickup
                        </Button>
                      )}
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleUpdateTask("status", "Completed")}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-gray-200">
              <CardContent className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Task Selected</h3>
                <p className="text-gray-600 mb-4">Select a task from the Tasks List to view and edit details</p>
                <Button onClick={() => setActiveTab("list")} className="bg-red-600 hover:bg-red-700 text-white">
                  Go to Tasks List
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
