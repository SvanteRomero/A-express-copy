'use client'

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs"
import { useAuth } from "@/hooks/use-auth"
import { useTechnicianTasks } from "@/hooks/use-tasks"
import { TechnicianTaskCard } from "./technician-task-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { TaskListSkeleton } from "@/components/ui/core/loaders"
import { Button } from "@/components/ui/core/button"
import { TasksDisplay } from "@/components/tasks/task_utils/tasks-display"


export function TechnicianTasksPage() {
  const { user } = useAuth()
  const userId = user?.id ? user.id.toString() : undefined
  const isWorkshopTech = user?.is_workshop || false

  const [activeTab, setActiveTab] = useState("in-progress")
  const [searchQuery, setSearchQuery] = useState("");
  const [pages, setPages] = useState<Record<string, number>>({
    'in-progress': 1,
    'completed': 1,
    'in-workshop': 1,
  });

  // Reset page when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // No need to reset page here, as pages are managed per tab in the 'pages' state
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    // Reset all tab pages to 1 when search query changes
    setPages({
      'in-progress': 1,
      'completed': 1,
      'in-workshop': 1,
    });
  };

  const currentPage = pages[activeTab] || 1;

  const {
    data: tasksData,
    isLoading,
    isError,
    error
  } = useTechnicianTasks(userId, isWorkshopTech, activeTab, currentPage, searchQuery) // Pass searchQuery to the hook

  const tasks = tasksData?.results || []
  const count = tasksData?.count || 0
  const totalPages = Math.ceil(count / 10)

  if (isLoading && currentPage === 1) { // Use currentPage here
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
        Showing {tasks.length > 0 ? (currentPage - 1) * 10 + 1 : 0} to {Math.min(currentPage * 10, count)} of {count} tasks
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPages(prev => ({ ...prev, [activeTab]: Math.max(1, prev[activeTab] - 1) }))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPages(prev => ({ ...prev, [activeTab]: Math.min(totalPages, prev[activeTab] + 1) }))}
          disabled={currentPage >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )

  // Helper to render TasksDisplay or TaskListCard based on context
  const renderTasksContent = (title: string, description: string) => (
    <>
      <TasksDisplay
        tasks={tasks}
        technicians={[]} // Technicians are not relevant for technician's own task view
        onRowClick={() => { }} // No specific row click action needed here, details page handles it
        showActions={false} // Technicians have specific actions on details page
        isManagerView={false}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchChange}
      // For technician view, we might not need all the filters Manager has, so we can omit serverSideFilters
      // properly IF we don't want to show the filter UI.
      // BUT, TasksDisplay will show client-side filters if we don't pass serverSideFilters object?
      // No, TasksDisplay logic: "effectiveSearchQuery = serverSideFilters ? externalSearchQuery ...".
      // If we want server-side SEARCH but no other filters, we should pass a minimal serverSideFilters object?
      // Or just pass externalSearchQuery?

      // If we pass `onSearchQueryChange` (which is `onExternalSearchQueryChange` in TasksDisplay),
      // AND we pass `searchQuery` (externalSearchQuery),
      // the `useTaskFiltering` hook will see `onSearchChange` is defined and set `isServerSideSearch` to true.
      // So client-side search will be disabled.
      // This is perfect for just search!
      />
      <div className="mt-4">
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-500">
            Showing {tasks.length > 0 ? (currentPage - 1) * 10 + 1 : 0} to {Math.min(currentPage * 10, count)} of {count} tasks
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPages(prev => ({ ...prev, [activeTab]: Math.max(1, prev[activeTab] - 1) }))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPages(prev => ({ ...prev, [activeTab]: Math.min(totalPages, prev[activeTab] + 1) }))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </>
  );


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
            {renderTasksContent("In Progress Tasks", "Tasks that are currently being worked on.")}
          </TabsContent>
          <TabsContent value="completed">
            {renderTasksContent("Completed Tasks", "Tasks that have been marked as completed.")}
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
