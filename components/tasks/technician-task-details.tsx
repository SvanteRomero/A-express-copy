"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Badge } from "@/components/ui/core/badge"
import { Button } from "@/components/ui/core/button"
import { Textarea } from "@/components/ui/core/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { Separator } from "@/components/ui/core/separator"
import { ScrollArea } from "@/components/ui/layout/scroll-area"
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  Printer,
  Calendar,
  Wrench,
  MessageSquare,
  CheckCircle,
  Package,
  Users,
  FileText,
  Plus,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getTask, updateTask, addTaskActivity } from "@/lib/api-client"

interface TechnicianTaskDetailsProps {
  taskId: string
}

export function TechnicianTaskDetails({ taskId }: TechnicianTaskDetailsProps) {
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [noteType, setNoteType] = useState("repair_step")
  const [currentLocation, setCurrentLocation] = useState("")
  const [urgency, setUrgency] = useState("")
  const [status, setStatus] = useState("")
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    loadTaskDetails()
  }, [taskId])

  const loadTaskDetails = async () => {
    try {
      setLoading(true)
      const response = await getTask(taskId)
      const taskData = response.data
      setTask(taskData)
      setCurrentLocation(taskData.current_location)
      setUrgency(taskData.urgency)
      setStatus(taskData.status)
    } catch (error) {
      console.error("Failed to load task details:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdating(true)
      await updateTask(taskId, { status: newStatus })
      setStatus(newStatus)
      await loadTaskDetails() // Reload to get updated notes
    } catch (error) {
      console.error("Failed to update status:", error)
    } finally {
      setUpdating(false)
    }
  }

  const handleLocationChange = async (newLocation: string) => {
    try {
      await updateTask(taskId, { current_location: newLocation })
      setCurrentLocation(newLocation)
    } catch (error) {
      console.error("Failed to update location:", error)
    }
  }

  const handleUrgencyChange = async (newUrgency: string) => {
    try {
      await updateTask(taskId, { urgency: newUrgency })
      setUrgency(newUrgency)
    } catch (error) {
      console.error("Failed to update urgency:", error)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    try {
      setUpdating(true)
      await addTaskActivity(taskId, {
        type: noteType,
        message: newNote,
      })
      setNewNote("")
      await loadTaskDetails() // Reload to get updated notes
    } catch (error) {
      console.error("Failed to add note:", error)
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkComplete = async () => {
    await handleStatusChange("Completed")
  }

  const handleRequestHelp = () => {
    console.log("Request help modal would open here")
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      "To Do": { label: "To Do", color: "bg-gray-100 text-gray-800" },
      "In Progress": { label: "In Progress", color: "bg-blue-100 text-blue-800" },
      "Awaiting Parts": { label: "Awaiting Parts", color: "bg-orange-100 text-orange-800" },
      "Done": { label: "Done", color: "bg-green-100 text-green-800" },
      "Cancelled": { label: "Cancelled", color: "bg-red-100 text-red-800" },
    }

    const config = statusConfig[status] || {
      label: status,
      color: "bg-gray-100 text-gray-800",
    }
    return <Badge className={`${config.color} hover:${config.color}`}>{config.label}</Badge>
  }

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig: any = {
      High: { label: "High", color: "bg-red-100 text-red-800" },
      Medium: { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
      Low: { label: "Low", color: "bg-green-100 text-green-800" },
    }

    const config = urgencyConfig[urgency] || {
      label: urgency,
      color: "bg-gray-100 text-gray-800",
    }
    return <Badge className={`${config.color} hover:${config.color}`}>{config.label}</Badge>
  }

  const getNoteIcon = (type: string) => {
    const iconMap: any = {
      diagnosis: <Wrench className="h-4 w-4 text-blue-600" />,
      repair_step: <CheckCircle className="h-4 w-4 text-green-600" />,
      status_update: <Clock className="h-4 w-4 text-purple-600" />,
      customer_communication: <MessageSquare className="h-4 w-4 text-orange-600" />,
      handoff_reason: <Users className="h-4 w-4 text-red-600" />,
      parts_request: <Package className="h-4 w-4 text-yellow-600" />,
    }
    return iconMap[type] || <FileText className="h-4 w-4 text-gray-600" />
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-8 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex-1 space-y-8 p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Task Not Found</h2>
          <p className="text-gray-600 mb-4">The requested task could not be found.</p>
          <Button onClick={() => router.back()} className="bg-red-600 hover:bg-red-700">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Task Details - {task.id}</h1>
          <p className="text-gray-600 mt-1">Repair management and documentation</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Overview */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Task Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Initial Issue */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Initial Issue Description</h4>
                <p className="text-blue-800">{task.description}</p>
              </div>

              {/* Read-only fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Task ID</label>
                  <p className="text-lg font-semibold text-gray-900">{task.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Customer Name</label>
                  <p className="text-lg font-semibold text-gray-900">{task.customer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Laptop Model</label>
                  <p className="text-lg font-semibold text-gray-900">{task.laptop_model}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Serial Number</label>
                  <p className="text-lg font-semibold text-gray-900">{task.serial_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date In</label>
                  <p className="text-lg font-semibold text-gray-900">{task.date_in}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Assigned Technician</label>
                  <p className="text-lg font-semibold text-gray-900">{task.assigned_to_details?.full_name}</p>
                </div>
              </div>

              <Separator />

              {/* Editable fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Current Physical Location</label>
                  <Select value={currentLocation} onValueChange={handleLocationChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Front Desk">Front Desk</SelectItem>
                      <SelectItem value="Repair Bay 1">Repair Bay 1</SelectItem>
                      <SelectItem value="Repair Bay 2">Repair Bay 2</SelectItem>
                      <SelectItem value="Parts Storage">Parts Storage</SelectItem>
                      <SelectItem value="Quality Control">Quality Control</SelectItem>
                      <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Urgency Level</label>
                  <Select value={urgency} onValueChange={handleUrgencyChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Repair Status & Actions */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Repair Status & Actions</CardTitle>
              <CardDescription>Update task status and perform key actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Current Status</label>
                  <Select value={status} onValueChange={handleStatusChange} disabled={updating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">To Do</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Awaiting Parts">Awaiting Parts</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-6">{getStatusBadge(status)}</div>
              </div>

              <div className="flex gap-3">
                {status === "Done" && (
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleMarkComplete}
                    disabled={updating}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Complete
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50 bg-transparent"
                  onClick={handleRequestHelp}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Request Technician Help
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Repair Notes & Activity Log */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Repair Notes & Activity Log</CardTitle>
              <CardDescription>Complete history of work performed and notes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Activity Log */}
              <ScrollArea className="h-96 w-full border rounded-lg p-4">
                <div className="space-y-4">
                  {task.activities && task.activities.length > 0 ? (
                    task.activities.map((note: any) => (
                      <div key={note.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-white rounded-full border">{getNoteIcon(note.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{note.user.full_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {note.type.replace("_", " ").toUpperCase()}
                            </Badge>
                            <span className="text-xs text-gray-500">{new Date(note.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-700">{note.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No activity logged yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Add New Note */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex gap-3">
                  <Select value={noteType} onValueChange={setNoteType}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diagnosis">Diagnosis</SelectItem>
                      <SelectItem value="repair_step">Repair Step</SelectItem>
                      <SelectItem value="status_update">Status Update</SelectItem>
                      <SelectItem value="customer_communication">Customer Communication</SelectItem>
                      <SelectItem value="parts_request">Parts Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Add a new note about this repair..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || updating}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900">{task.customer_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="text-gray-900">{task.customer_phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{task.customer_email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Phone className="h-4 w-4 mr-2" />
                Call Customer
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Mail className="h-4 w-4 mr-2" />
                Email Customer
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Printer className="h-4 w-4 mr-2" />
                Print Work Order
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Date In</p>
                  <p className="text-sm text-gray-600">{task.date_in}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Est. Completion</p>
                  <p className="text-sm text-gray-600">{task.due_date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Priority</p>
                  <div className="mt-1">{getUrgencyBadge(urgency)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
