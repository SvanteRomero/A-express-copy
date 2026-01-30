import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Badge } from "@/components/ui/core/badge"
import { StatusBadge, UrgencyBadge, WorkshopStatusBadge } from "@/components/tasks/task_utils/task-badges"
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
  Clock,
  Wrench,
  MessageSquare,
  CheckCircle,
  Package,
  Users,
  FileText,
  Plus,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { addTaskActivity } from "@/lib/api-client"
import {
  showSentToWorkshopToast,
  showWorkshopSelectionErrorToast,
  showWorkshopStatusChangedToast,
} from "@/components/notifications/toast"
import { useTask, useUpdateTask } from "@/hooks/use-tasks";
import { useWorkshopLocations } from "@/hooks/use-locations";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface TechnicianTaskDetailsProps {
  taskId: string
}

export function TechnicianTaskDetails({ taskId }: TechnicianTaskDetailsProps) {
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient();

  const { data: task, isLoading, isError, error } = useTask(taskId);
  const { data: workshopLocations } = useWorkshopLocations();

  const [updating, setUpdating] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [noteType, setNoteType] = useState("note")
  const [isSendToWorkshopDialogOpen, setIsSendToWorkshopDialogOpen] = useState(false)
  const [selectedWorkshopLocation, setSelectedWorkshopLocation] = useState<string | undefined>(undefined)
  const [isCompletionOutcomeDialogOpen, setIsCompletionOutcomeDialogOpen] = useState(false)
  const [toBeCheckedEnabled, setToBeCheckedEnabled] = useState(false)

  const updateTaskMutation = useUpdateTask();

  const addTaskActivityMutation = useMutation({
    mutationFn: (data: any) => addTaskActivity(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    updateTaskMutation.mutate({ id: taskId, updates: { status: newStatus } });
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    addTaskActivityMutation.mutate({ type: noteType, message: newNote });
    setNewNote("")
  }

  const handleMarkComplete = async () => {
    if (!task) return;

    // Check if task has no workshop_status - if so, show outcome dialog
    if (!task.workshop_status) {
      setIsCompletionOutcomeDialogOpen(true)
    } else {
      // Task already has outcome from workshop, just mark as completed
      await handleStatusChange("Completed")
    }
  }

  const confirmCompletion = async (outcome: string) => {
    setIsCompletionOutcomeDialogOpen(false)
    updateTaskMutation.mutate({
      id: taskId,
      updates: {
        status: "Completed",
        workshop_status: outcome
      }
    });
  }


  const handleSendToWorkshop = async () => {
    if (!selectedWorkshopLocation) {
      showWorkshopSelectionErrorToast()
      return
    }
    updateTaskMutation.mutate({
      id: taskId,
      updates: {
        workshop_location: selectedWorkshopLocation,
      }
    });
    setIsSendToWorkshopDialogOpen(false)
    showSentToWorkshopToast()
  }

  const handleWorkshopStatusChange = async (newStatus: string, toBeChecked: boolean = false) => {
    updateTaskMutation.mutate({ id: taskId, updates: { workshop_status: newStatus, to_be_checked: toBeChecked } });
    showWorkshopStatusChangedToast(newStatus)
  }

  const handleVerification = async (agrees: boolean) => {
    updateTaskMutation.mutate({
      id: taskId,
      updates: {
        verification_action: agrees ? 'agree' : 'disagree'
      }
    });
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
      <div className="flex-1 space-y-6 sm:space-y-8 p-4 sm:p-6">
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
      <div className="flex-1 space-y-6 sm:space-y-8 p-4 sm:p-6">
        <div className="text-center py-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Task Not Found</h2>
          <p className="text-gray-600 mb-4">The requested task could not be found.</p>
          <Button onClick={() => router.back()} className="bg-red-600 hover:bg-red-700">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 sm:space-y-8 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="flex items-center gap-2 w-fit">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden xs:inline">Back to Tasks</span>
          <span className="xs:hidden">Back</span>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">Task Details - {task.title}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Repair management and documentation</p>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Main Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Task Overview */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Task Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Initial Issue */}
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">Initial Issue Description</h4>
                <p className="text-blue-800 text-sm sm:text-base">{task.description}</p>
              </div>

              {/* Read-only fields */}
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Task ID</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{task.title}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Customer Name</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{task.customer_details?.name}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Laptop Model</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">{task.brand_details?.name} {task.laptop_model_details?.name || task.laptop_model}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Date In</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{task.date_in}</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Priority</label>
                  <div className="mt-1"><UrgencyBadge urgency={task.urgency} /></div>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700">Assigned Technician</label>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{task.assigned_to_details?.full_name}</p>
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Repair Status & Actions</CardTitle>
              <CardDescription className="text-sm">Update task status and perform key actions</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700">Current Status</label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={task.status} />
                  {['Solved', 'Not Solved'].includes(task.workshop_status || '') && (
                    <WorkshopStatusBadge status={task.workshop_status || ''} />
                  )}
                  {task.to_be_checked && (
                    <WorkshopStatusBadge status="To Be Checked" />
                  )}
                  {task.workshop_status === 'In Workshop' && (
                    <WorkshopStatusBadge status='In Workshop' />
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* Verification Mode: Original tech sees Solved/Not Solved buttons */}
                {task.to_be_checked && user?.id === task.original_technician_snapshot && (
                  <VerificationButtons
                    workshopStatus={task.workshop_status}
                    onVerify={handleVerification}
                    updating={updateTaskMutation.isPending}
                  />
                )}

                {/* Normal Mode: Standard buttons shown when not in verification mode */}
                {!task.to_be_checked && (
                  <>
                    {task && task.status !== 'Completed' && (!task.workshop_status || ['Solved', 'Not Solved'].includes(task.workshop_status)) && (!user?.is_workshop || !task.original_technician) && (
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                        onClick={handleMarkComplete}
                        disabled={updating}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Complete
                      </Button>
                    )}
                    {task.status === 'In Progress' && task.workshop_status !== 'In Workshop' && !user?.is_workshop && user?.id === task.assigned_to && (
                      <Dialog open={isSendToWorkshopDialogOpen} onOpenChange={setIsSendToWorkshopDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 bg-transparent w-full sm:w-auto">
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
                                    <SelectItem key={location.id} value={String(location.id)}>{location.name}</SelectItem>
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
                        toBeChecked={toBeCheckedEnabled}
                        onToBeCheckedChange={setToBeCheckedEnabled}
                      />
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Completion Outcome Dialog */}
          <Dialog open={isCompletionOutcomeDialogOpen} onOpenChange={(open) => !open && setIsCompletionOutcomeDialogOpen(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Specify Task Outcome</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-500 mb-4">
                  Was this task resolved successfully? Please specify the outcome of the repair.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="outline"
                    className="w-full border-red-200 hover:bg-red-50 text-red-700"
                    onClick={() => confirmCompletion('Not Solved')}
                  >
                    Not Solved
                  </Button>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => confirmCompletion('Solved')}
                  >
                    Solved
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Repair Notes & Activity Log */}
          <Card className="border-gray-200">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Repair Notes & Activity Log</CardTitle>
              <CardDescription className="text-sm">Complete history of work performed and notes</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              {/* Activity Log */}
              <ScrollArea className="h-64 sm:h-96 w-full border rounded-lg p-2 sm:p-4">
                <div className="space-y-3 sm:space-y-4">
                  {task.activities && task.activities.length > 0 ? (
                    task.activities.map((note: any) => (
                      <div key={note.id} className="flex gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <div className="p-1.5 sm:p-2 bg-white rounded-full border shrink-0">{getNoteIcon(note.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{note.user.full_name}</span>
                            <Badge variant="outline" className="text-[10px] sm:text-xs">
                              {note.type.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>
                          <span className="text-[10px] sm:text-xs text-gray-500 block mb-1">{new Date(note.timestamp).toLocaleString()}</span>
                          <p className="text-gray-700 text-sm sm:text-base break-words">{note.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm sm:text-base">No activity logged yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Add New Note */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex gap-3">
                  <Select value={noteType} onValueChange={setNoteType}>
                    <SelectTrigger className="w-full sm:w-48">
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
                  className="text-base"
                />
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
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
      </div>
    </div >
  )
}

function WorkshopStatusButtons({
  onStatusChange,
  updating,
  toBeChecked,
  onToBeCheckedChange
}: {
  onStatusChange: (status: string, toBeChecked: boolean) => void,
  updating: boolean,
  toBeChecked: boolean,
  onToBeCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-3 w-full sm:w-auto">
      {/* Checkbox for To Be Checked */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="to-be-checked"
          checked={toBeChecked}
          onChange={(e) => onToBeCheckedChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
        />
        <label htmlFor="to-be-checked" className="text-sm text-gray-600 cursor-pointer">
          To Be Checked (require verification by original technician)
        </label>
      </div>

      {/* Existing buttons */}
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="bg-green-500 hover:bg-green-600 text-white w-full sm:w-auto" disabled={updating}>Solved</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                {toBeChecked
                  ? "This will mark the task as solved and send it to the original technician for verification."
                  : "This will mark the task as solved. This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onStatusChange('Solved', toBeChecked)}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto" disabled={updating}>Not Solved</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                {toBeChecked
                  ? "This will mark the task as not solved and send it to the original technician for verification."
                  : "This will mark the task as not solved. This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onStatusChange('Not Solved', toBeChecked)}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

function VerificationButtons({
  workshopStatus,
  onVerify,
  updating
}: {
  workshopStatus: string | null,
  onVerify: (agrees: boolean) => void,
  updating: boolean
}) {
  const [isDisputeDialogOpen, setIsDisputeDialogOpen] = useState(false)

  const handleClick = (clickedStatus: string) => {
    if (clickedStatus === workshopStatus) {
      // User agrees - clear verification
      onVerify(true)
    } else {
      // User disagrees - show confirmation dialog
      setIsDisputeDialogOpen(true)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 w-full">
        <p className="text-sm text-gray-500">
          Workshop marked this as <strong>{workshopStatus}</strong>. Do you agree?
        </p>
        <div className="flex gap-2">
          <Button
            className="bg-green-500 hover:bg-green-600 text-white w-full sm:w-auto"
            onClick={() => handleClick('Solved')}
            disabled={updating}
          >
            Solved
          </Button>
          <Button
            className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto"
            onClick={() => handleClick('Not Solved')}
            disabled={updating}
          >
            Not Solved
          </Button>
        </div>
      </div>

      {/* Dispute confirmation dialog */}
      <AlertDialog open={isDisputeDialogOpen} onOpenChange={setIsDisputeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dispute Workshop Outcome?</AlertDialogTitle>
            <AlertDialogDescription>
              You are disputing the workshop&apos;s &quot;{workshopStatus}&quot; assessment.
              The task will be sent back to the workshop for a do-over.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setIsDisputeDialogOpen(false)
              onVerify(false)
            }}>
              Send Back to Workshop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}