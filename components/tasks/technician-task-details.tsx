import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Badge } from "@/components/ui/core/badge"
import { Button } from "@/components/ui/core/button"
import { Textarea } from "@/components/ui/core/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { Separator } from "@/components/ui/core/separator"
import { ScrollArea } from "@/components/ui/layout/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/feedback/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/feedback/alert-dialog"
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
import { updateTask, addTaskActivity } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useTask, useWorkshopLocations, useWorkshopTechnicians } from "@/hooks/use-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface TechnicianTaskDetailsProps {
  taskId: string
}

export function TechnicianTaskDetails({ taskId }: TechnicianTaskDetailsProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient();

  const { data: task, isLoading, isError, error } = useTask(taskId);
  const { data: workshopLocations } = useWorkshopLocations();
  const { data: workshopTechnicians } = useWorkshopTechnicians();

  const [updating, setUpdating] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [noteType, setNoteType] = useState("note")
  const [isSendToWorkshopDialogOpen, setIsSendToWorkshopDialogOpen] = useState(false)
  const [selectedWorkshopLocation, setSelectedWorkshopLocation] = useState<string | undefined>(undefined)
  const [selectedWorkshopTechnician, setSelectedWorkshopTechnician] = useState<string | undefined>(undefined)

  const updateTaskMutation = useMutation({
    mutationFn: (data: any) => updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const addTaskActivityMutation = useMutation({
    mutationFn: (data: any) => addTaskActivity(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    updateTaskMutation.mutate({ status: newStatus });
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    addTaskActivityMutation.mutate({ type: noteType, message: newNote });
    setNewNote("")
  }

  const handleMarkComplete = async () => {
    await handleStatusChange("Completed")
  }

  const handleSendToWorkshop = async () => {
    if (!selectedWorkshopLocation || !selectedWorkshopTechnician) {
      toast({
        title: "Error",
        description: "Please select a workshop location and technician.",
        variant: "destructive",
      })
      return
    }
    updateTaskMutation.mutate({ 
      workshop_location: selectedWorkshopLocation,
      workshop_technician: selectedWorkshopTechnician,
    });
    setIsSendToWorkshopDialogOpen(false)
    toast({
      title: "Success",
      description: "Task sent to workshop successfully.",
    })
  }

  const handleWorkshopStatusChange = async (newStatus: string) => {
    updateTaskMutation.mutate({ workshop_status: newStatus });
    toast({
      title: "Success",
      description: `Task marked as ${newStatus}.`,
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      "Pending": { label: "Pending", color: "bg-gray-100 text-gray-800" },
      "In Progress": { label: "In Progress", color: "bg-blue-100 text-blue-800" },
      "Awaiting Parts": { label: "Awaiting Parts", color: "bg-orange-100 text-orange-800" },
      "Completed": { label: "Completed", color: "bg-green-100 text-green-800" },
      "Ready for Pickup": { label: "Ready for Pickup", color: "bg-green-100 text-green-800" },
      "Picked Up": { label: "Picked Up", color: "bg-purple-100 text-purple-800" },
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
      Yupo: { label: "Yupo", color: "bg-green-100 text-green-800" },
      "Katoka kidogo": { label: "Katoka kidogo", color: "bg-yellow-100 text-yellow-800" },
      Kaacha: { label: "Kaacha", color: "bg-red-100 text-red-800" },
      Expedited: { label: "Expedited", color: "bg-blue-100 text-blue-800" },
      "Ina Haraka": { label: "Ina Haraka", color: "bg-purple-100 text-purple-800" },
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
      workshop: <Wrench className="h-4 w-4 text-indigo-600" />,
    }
    return iconMap[type] || <FileText className="h-4 w-4 text-gray-600" />
  }

  if (isLoading) {
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

  if (isError) {
    return <div>Error: {error.message}</div>
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Task Details - {task.title}</h1>
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
                  <p className="text-lg font-semibold text-gray-900">{task.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Customer Name</label>
                  <p className="text-lg font-semibold text-gray-900">{task.customer_details?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Laptop Model</label>
                  <p className="text-lg font-semibold text-gray-900">{task.laptop_model}</p>
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
                <div>
                  <label className="text-sm font-medium text-gray-700">Current Status</label>
                  <div className="mt-2 flex items-center gap-2">
                    {getStatusBadge(task.status)}
                    {['Solved', 'Not Solved'].includes(task.workshop_status) && (
                      <Badge className={task.workshop_status === 'Solved' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {task.workshop_status}
                      </Badge>
                    )}
                    {task.workshop_status === 'In Workshop' && (
                        <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-100">In Workshop</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {task && task.status !== 'Completed' && (!task.workshop_status || ['Solved', 'Not Solved'].includes(task.workshop_status)) && (!user?.is_workshop || !task.original_technician) && (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleMarkComplete}
                    disabled={updating}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Complete
                  </Button>
                )}
                {task.status === 'In Progress' && !task.workshop_status && task.original_technician && (
                  <Dialog open={isSendToWorkshopDialogOpen} onOpenChange={setIsSendToWorkshopDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 bg-transparent">
                        <Users className="h-4 w-4 mr-2" />
                        Send to Workshop
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send to Workshop</DialogTitle>
                        <DialogDescription>
                          Select a workshop location and technician to send the task to.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <label htmlFor="workshop-location">Workshop Location</label>
                          <Select value={selectedWorkshopLocation} onValueChange={setSelectedWorkshopLocation}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                            <SelectContent>
                              {workshopLocations?.map(location => (
                                <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <label htmlFor="workshop-technician">Workshop Technician</label>
                          <Select value={selectedWorkshopTechnician} onValueChange={setSelectedWorkshopTechnician}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a technician" />
                            </SelectTrigger>
                            <SelectContent>
                              {workshopTechnicians?.map(technician => (
                                <SelectItem key={technician.id} value={technician.id}>{technician.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSendToWorkshopDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSendToWorkshop} disabled={updating}>Send</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                {user?.is_workshop && task.workshop_status === 'In Workshop' && (
                  <WorkshopStatusButtons 
                    onStatusChange={handleWorkshopStatusChange} 
                    updating={updating} 
                  />
                )}
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
                      <SelectItem value="note">General Note</SelectItem>
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
                <AlertTriangle className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Priority</p>
                  <div className="mt-1">{getUrgencyBadge(task.urgency)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function WorkshopStatusButtons({ onStatusChange, updating }: { onStatusChange: (status: string) => void, updating: boolean }) {
  return (
    <div className="flex gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button className="bg-green-500 hover:bg-green-600 text-white" disabled={updating}>Solved</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the task as solved. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onStatusChange('Solved')}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button className="bg-red-500 hover:bg-red-600 text-white" disabled={updating}>Not Solved</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the task as not solved. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onStatusChange('Not Solved')}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}