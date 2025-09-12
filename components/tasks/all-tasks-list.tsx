"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Badge } from "@/components/ui/core/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import {
  Search,
  Plus,
  Filter,
  Calendar,
  User,
  MapPin,
  AlertTriangle,
  Laptop,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getTasks } from "@/lib/api-client"

type SortField = any
type SortDirection = "asc" | "desc" | null

export function AllTasksList() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [technicianFilter, setTechnicianFilter] = useState<string>("all")
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

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

  // Check if user can create new tasks (Admin, Manager, or Front Desk roles)
  const canCreateTasks = user?.role === "Administrator" || user?.role === "Manager" || user?.role === "Front Desk"

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

  const handleRowClick = (taskId: string) => {
    // Navigate to task details page
    window.location.href = `/dashboard/tasks/${taskId}`
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">All Tasks</h1>
          <p className="text-gray-600 mt-2">Comprehensive view of all repair tasks in the system</p>
        </div>
        {canCreateTasks && (
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        )}
      </div>

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
                  <TableHead className="font-semibold text-gray-900">Task ID</TableHead>
                  <TableHead className="font-semibold text-gray-900">Customer Name</TableHead>
                  <TableHead className="font-semibold text-gray-900">Laptop Model</TableHead>
                  <TableHead className="font-semibold text-gray-900">Date In</TableHead>
                  <TableHead className="font-semibold text-gray-900">Assigned Technician</TableHead>
                  <TableHead className="font-semibold text-gray-900">Current Status</TableHead>
                  <TableHead className="font-semibold text-gray-900">Urgency</TableHead>
                  <TableHead className="font-semibold text-gray-900">Current Location</TableHead>
                  <TableHead className="font-semibold text-gray-900">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(task.id)}
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{task.date_in}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900 max-w-[150px] truncate" title={task.assigned_to_details?.full_name}>
                          {task.assigned_to_details?.full_name || 'Unassigned'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell>{getUrgencyBadge(task.urgency)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{task.current_location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete task ${task.id}?`)) {
                            // Add delete logic here
                            console.log(`Deleting task ${task.id}`);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
    </div>
  )
}