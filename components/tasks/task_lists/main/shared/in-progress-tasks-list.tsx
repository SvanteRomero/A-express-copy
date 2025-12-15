'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Badge } from "@/components/ui/core/badge"
import { useAuth } from "@/lib/auth-context"
import { Laptop } from "lucide-react"
import { useInProgressTasks } from "@/hooks/use-data"

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

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Pending":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{status}</Badge>
    case "In Progress":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{status}</Badge>
    case "Awaiting Parts":
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">{status}</Badge>
    case "Completed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{status}</Badge>
    case "Ready for Pickup":
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">{status}</Badge>
    case "Picked Up":
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>
    case "Cancelled":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{status}</Badge>
    case "Terminated":
        return <Badge className="bg-red-200 text-red-900 hover:bg-red-200">{status}</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

const getWorkshopStatusBadge = (workshopStatus: string) => {
  switch (workshopStatus) {
    case "In Workshop":
      return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">{workshopStatus}</Badge>
    case "Solved":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{workshopStatus}</Badge>
    case "Not Solved":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{workshopStatus}</Badge>
    default:
      return <Badge variant="secondary">{workshopStatus}</Badge>
  }
}

export function InProgressTasksList({ isWorkshopView = false }: { isWorkshopView?: boolean }) {
  const { user } = useAuth()
  const { data: tasks, isLoading, isError, error } = useInProgressTasks(isWorkshopView, user?.id ? user.id.toString() : undefined);

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>In Progress Tasks</CardTitle>
                <CardDescription>Tasks that are currently being worked on.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
                </div>
            </CardContent>
        </Card>
    );
  }

  if (isError) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>In Progress Tasks</CardTitle>
                <CardDescription>Tasks that are currently being worked on.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-red-500">Error: {error.message}</div>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>In Progress Tasks</CardTitle>
        <CardDescription>Tasks that are currently being worked on.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {tasks?.map((task) => (
            <div key={task.id} className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{task.customer_details?.name}</h3>
                      <p className="text-sm text-gray-500">Task ID: <span className="font-medium text-red-600">{task.title}</span></p>
                    </div>
                    {getUrgencyBadge(task.urgency)}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-800">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Laptop className="h-4 w-4" />
                      <span>{task.laptop_model}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusBadge(task.status)}
                    </div>
                    {task.workshop_status && (
                        <div className="flex items-center gap-2">
                            {getWorkshopStatusBadge(task.workshop_status)}
                        </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4 flex flex-col justify-between items-end">
                  <Button variant="outline" asChild className="w-full md:w-auto">
                    <a href={`/dashboard/tasks/${encodeURIComponent(task.title)}`}>View Details</a>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
