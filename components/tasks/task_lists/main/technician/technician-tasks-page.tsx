'use client'

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs"
import { useAuth } from "@/hooks/use-auth"
import { useTechnicianTasks } from "@/hooks/use-tasks"
import { TechnicianTaskCard } from "./technician-task-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { TaskListSkeleton } from "@/components/ui/core/loaders"
import { Button } from "@/components/ui/core/button"


export function TechnicianTasksPage() {
  const { user } = useAuth()
  const userId = user?.id ? user.id.toString() : undefined
  const isWorkshopTech = user?.is_workshop || false

  const [activeTab, setActiveTab] = useState("in-progress")
  const [page, setPage] = useState(1)

  // Reset page when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setPage(1)
  }

  const {
    data: tasksData,
    isLoading,
    isError,
    error
  } = useTechnicianTasks(userId, isWorkshopTech, activeTab, page)

  const tasks = tasksData?.results || []
  const count = tasksData?.count || 0
  const totalPages = Math.ceil(count / 10)

  if (isLoading && page === 1) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tasks</h1>
        <TaskListSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tasks</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-red-500">Error: {error?.message}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const PaginationControls = () => (
    <div className="flex items-center justify-between mt-4 border-t pt-4">
      <div className="text-sm text-gray-500">
        Showing {tasks.length > 0 ? (page - 1) * 10 + 1 : 0} to {Math.min(page * 10, count)} of {count} tasks
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )

  if (isWorkshopTech) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tasks</h1>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="in-progress" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">In Progress</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value="in-progress">
            <TaskListCard
              title="In Progress Tasks"
              description="Tasks that are currently being worked on."
              tasks={tasks}
            >
              <PaginationControls />
            </TaskListCard>
          </TabsContent>
          <TabsContent value="completed">
            <TaskListCard
              title="Completed Tasks"
              description="Tasks that have been marked as completed."
              tasks={tasks}
            >
              <PaginationControls />
            </TaskListCard>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tasks</h1>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="in-progress" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">In Progress</TabsTrigger>
          <TabsTrigger value="in-workshop" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">In Workshop</TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="in-progress">
          <TaskListCard
            title="In Progress Tasks"
            description="Tasks that are currently being worked on."
            tasks={tasks}
          >
            <PaginationControls />
          </TaskListCard>
        </TabsContent>
        <TabsContent value="in-workshop">
          <TaskListCard
            title="In Workshop Tasks"
            description="Tasks that are currently in the workshop."
            tasks={tasks}
          >
            <PaginationControls />
          </TaskListCard>
        </TabsContent>
        <TabsContent value="completed">
          <TaskListCard
            title="Completed Tasks"
            description="Tasks that have been marked as completed."
            tasks={tasks}
          >
            <PaginationControls />
          </TaskListCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Shared task list card component
function TaskListCard({
  title,
  description,
  tasks,
  children
}: {
  title: string
  description: string
  tasks: any[]
  children?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {tasks?.length > 0 ? (
            tasks.map((task) => (
              <TechnicianTaskCard key={task.id} task={task} />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No tasks found
            </div>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
