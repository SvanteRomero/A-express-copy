'use client'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Label } from "@/components/ui/core/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { useAuth } from "@/hooks/use-auth"
import { updateTask, addTaskActivity } from "@/lib/api-client"
import { useTask, useTaskStatusOptions, useTaskUrgencyOptions } from "@/hooks/use-tasks"
import { useTechnicians } from "@/hooks/use-users"
import { useLocations } from "@/hooks/use-locations"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/core/badge"

interface RepairManagementProps {
  taskId: string
}

export default function RepairManagement({ taskId }: RepairManagementProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: taskData, isLoading, isError, error } = useTask(taskId)
  const { data: technicians } = useTechnicians()
  const { data: locations } = useLocations()
  const { data: statusOptions } = useTaskStatusOptions()
  const { data: urgencyOptions } = useTaskUrgencyOptions()
  const { toast } = useToast()

  const [repairManagementData, setRepairManagementData] = useState({
    assigned_to: "",
    status: "",
    current_location: "",
    urgency: "",
  })

  useEffect(() => {
    if (taskData) {
      setRepairManagementData({
        assigned_to: taskData.assigned_to?.toString() || "",
        status: taskData.status || "",
        current_location: taskData.current_location || "",
        urgency: taskData.urgency || "",
      })
    }
  }, [taskData])

  const updateTaskMutation = useMutation({
    mutationFn: (updates: { [key: string]: any }) => updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] })
    },
  })

  const handleRepairManagementSave = () => {
    if (!taskData) return
    const changes: { [key: string]: any } = {}
    const activityMessages: string[] = []

    if (repairManagementData.assigned_to !== (taskData.assigned_to?.toString() || "")) {
      changes.assigned_to = repairManagementData.assigned_to
      const oldTech =
        technicians?.find(t => t.id.toString() === (taskData.assigned_to?.toString() || ""))?.full_name || "Unassigned"
      const newTech =
        technicians?.find(t => t.id.toString() === repairManagementData.assigned_to)?.full_name || "Unassigned"
      activityMessages.push(`Assigned Technician changed from ${oldTech} to ${newTech}`)
    }
    if (repairManagementData.status !== taskData.status) {
      changes.status = repairManagementData.status
      activityMessages.push(`Status changed from ${taskData.status} to ${repairManagementData.status}`)
    }
    if (repairManagementData.current_location !== taskData.current_location) {
      changes.current_location = repairManagementData.current_location
      activityMessages.push(`Location changed from ${taskData.current_location} to ${repairManagementData.current_location}`)
    }
    if (repairManagementData.urgency !== taskData.urgency) {
      changes.urgency = repairManagementData.urgency
      activityMessages.push(`Urgency changed from ${taskData.urgency} to ${repairManagementData.urgency}`)
    }

    if (Object.keys(changes).length > 0) {
      updateTaskMutation.mutate(changes, {
        onSuccess: () => {
          toast({ title: "Changes Saved", description: "Repair management details have been updated." })
          if (activityMessages.length > 0) {
            const message = activityMessages.join(", ")
            addTaskActivity(taskId, { message: `Repair management updated: ${message}` })
          }
        },
      })
    }
  }

  const hasRepairManagementChanges = useMemo(() => {
    if (!taskData) return false
    return (
      repairManagementData.assigned_to !== (taskData.assigned_to?.toString() || "") ||
      repairManagementData.status !== taskData.status ||
      repairManagementData.current_location !== taskData.current_location ||
      repairManagementData.urgency !== taskData.urgency
    )
  }, [repairManagementData, taskData])

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

  const isAdmin = user?.role === "Administrator"
  const isManager = user?.role === "Manager"
  const isTechnician = user?.role === "Technician"
  const isFrontDesk = user?.role === "Front Desk"

  const canEditTechnician = isAdmin || isManager
  const canEditStatus = isAdmin || isTechnician
  const canEditLocation = isAdmin || isManager
  const canEditUrgency = isAdmin || isManager || isFrontDesk

  if (isLoading) {
    return <div>Loading repair management...</div>
  }

  if (isError) {
    return <div>Error loading repair management.</div>
  }
  if (!taskData) {
    return <div>No task data found.</div>
  }

  return (
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
                value={repairManagementData.assigned_to}
                onValueChange={value => setRepairManagementData(prev => ({ ...prev, assigned_to: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {technicians?.map(tech => (
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
                value={repairManagementData.status}
                onValueChange={value => setRepairManagementData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions?.map(status => (
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
                value={repairManagementData.current_location}
                onValueChange={value => setRepairManagementData(prev => ({ ...prev, current_location: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map(location => (
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
            <Select
              value={repairManagementData.urgency}
              onValueChange={value => setRepairManagementData(prev => ({ ...prev, urgency: value }))}
              disabled={!canEditUrgency}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {urgencyOptions?.map(priority => (
                  <SelectItem key={priority[0]} value={priority[0]}>
                    {priority[1]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleRepairManagementSave} disabled={!hasRepairManagementChanges}>
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  )
}