"use client"

import { useState, useEffect } from "react"
import { getMediaUrl } from "@/lib/config";
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Badge } from "@/components/ui/core/badge"
import { ScrollArea } from "@/components/ui/layout/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import {
  AlertTriangle,
  ClipboardList,
  Clock,
  MessageSquare,
  Phone,
  Plus,
  Settings,
  Undo2,
  ChevronDown,
  ChevronUp,
  User,
  HardDrive,
  FileText,
  Truck,
  Wrench,
  Info,
  CheckCircle,
} from "lucide-react"

interface TaskActivityLogProps {
  taskId: string
}

export function TaskActivityLog({ taskId }: TaskActivityLogProps) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true)
      try {
        const response = await apiClient.get(`/tasks/${taskId}/activities/`)
        if (response.data) {
          setActivities(response.data)
        }
      } catch (error) {
        console.error("Failed to fetch activities:", error)
      } finally {
        setLoading(false)
      }
    }

    if (taskId) {
      fetchActivities()
    }
  }, [taskId])

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const getActivityIcon = (type: string) => {
    const iconClass = "h-5 w-5"
    switch (type) {
      case "status_update":
        return <Settings className={`${iconClass} text-blue-500`} />
      case "note":
        return <MessageSquare className={`${iconClass} text-gray-500`} />
      case "diagnosis":
        return <ClipboardList className={`${iconClass} text-purple-500`} />
      case "customer_contact":
        return <Phone className={`${iconClass} text-green-500`} />
      case "intake":
        return <Plus className={`${iconClass} text-orange-500`} />
      case "rejected":
        return <AlertTriangle className={`${iconClass} text-red-500`} />
      case "ready":
        return <CheckCircle className={`${iconClass} text-green-500`} />
      case "returned":
        return <Undo2 className={`${iconClass} text-yellow-500`} />
      case "assignment":
        return <User className={`${iconClass} text-teal-500`} />

      case "device_note":
        return <FileText className={`${iconClass} text-gray-500`} />
      case "intake_form":
        return <FileText className={`${iconClass} text-cyan-500`} />
      case "workshop_transfer":
        return <Truck className={`${iconClass} text-lime-500`} />
      case "repair_start":
        return <Wrench className={`${iconClass} text-rose-500`} />
      case "picked_up":
        return <Truck className={`${iconClass} text-green-500`} />
      default:
        return <Info className={`${iconClass} text-gray-400`} />
    }
  }

  const renderActivityDetails = (activity: any) => {
    if (!activity.details) return null

    return (
      <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-md border">
        <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(activity.details, null, 2)}</pre>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea>
          {loading ? (
            <p>Loading activities...</p>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Clock className="w-12 h-12 mb-4" />
              <p className="text-lg">No activities found for this task.</p>
              <p className="text-sm">As the task progresses, its history will appear here.</p>
            </div>
          ) : (
            <div className="timeline">
              {activities.map((activity) => (
                <div key={activity.id} className="timeline-item">
                  <div className="timeline-icon">{getActivityIcon(activity.type)}</div>
                  <div className="timeline-content">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={getMediaUrl(activity.user?.profile_picture_url)} alt="Avatar" />
                          <AvatarFallback>{activity.user?.full_name?.substring(0, 2) || "S"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {activity.user?.full_name || "System"}
                            <span className="text-xs text-muted-foreground ml-1">({activity.user?.role || "System"})</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.timestamp), "MMM d, yyyy, h:mm a")}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {activity.type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-gray-800">{activity.message}</p>
                    {activity.details && (
                      <>
                        <button
                          onClick={() => toggleExpanded(activity.id)}
                          className="text-xs text-blue-600 hover:underline mt-2 flex items-center"
                        >
                          {expanded[activity.id] ? "Hide Details" : "Show Details"}
                          {expanded[activity.id] ? (
                            <ChevronUp className="h-3 w-3 ml-1" />
                          ) : (
                            <ChevronDown className="h-3 w-3 ml-1" />
                          )}
                        </button>
                        {expanded[activity.id] && renderActivityDetails(activity)}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}