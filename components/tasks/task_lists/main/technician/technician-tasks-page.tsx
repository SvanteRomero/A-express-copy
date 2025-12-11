'use client'

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs"
import { useAuth } from "@/lib/auth-context"
import { InProgressTasksList } from "@/components/tasks/task_lists/main/shared/in-progress-tasks-list"
import { InWorkshopTasksList } from "@/components/tasks/task_lists/main/technician/in-workshop-tasks-list"
import { CompletedTasksList } from "@/components/tasks/task_lists/main/shared/completed-tasks-list"


export function TechnicianTasksPage() {
  const { user } = useAuth()

  if (user?.is_workshop) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Workshop Tasks</h1>
        <Tabs defaultValue="in-progress" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="in-progress" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">In Progress</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value="in-progress">
            <InProgressTasksList isWorkshopView={true} />
          </TabsContent>
          <TabsContent value="completed">
            <CompletedTasksList />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tasks</h1>
      <Tabs defaultValue="in-progress" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="in-progress" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">In Progress</TabsTrigger>
          <TabsTrigger value="in-workshop" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">In Workshop</TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="in-progress">
          <InProgressTasksList />
        </TabsContent>
        <TabsContent value="in-workshop">
          <InWorkshopTasksList />
        </TabsContent>
        <TabsContent value="completed">
          <CompletedTasksList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
