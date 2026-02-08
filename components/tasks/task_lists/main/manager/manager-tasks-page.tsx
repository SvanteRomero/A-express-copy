'use client';

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/core/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { deleteTask } from "@/lib/api-client";
import { TasksDisplay } from "@/components/tasks/task_utils/tasks-display";
import { BrandManager } from "@/components/brands/brand-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/feedback/dialog";
import { useUpdateTask, useTasks } from "@/hooks/use-tasks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/ui/core/loaders";
import { useTaskFiltering } from "@/hooks/use-task-filtering";
import Link from "next/link";
import { useAssignableUsers } from "@/hooks/use-users";

type Tab = 'pending' | 'completed' | 'myTasks';
const TABS_ORDER: Tab[] = ['pending', 'myTasks', 'completed'];

export function ManagerTasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('pending');

  // Use independent hooks for each tab to maintain separate states
  // 1. Pending Tasks Hook
  const pendingTasks = useTaskFiltering({
    initialStatus: "Pending,In Progress,Awaiting Parts,Diagnostic,Assigned - Not Accepted", // Combined status for "Current Tasks" view
    pageSize: 15
  });

  // 2. Completed Tasks Hook
  const completedTasks = useTaskFiltering({
    initialStatus: "Completed,Ready for Pickup",
    pageSize: 15
  });

  // 3. My Tasks Hook (for workshop managers or general assigned)
  const isWorkshopManager = user?.is_workshop || false;
  const myTasks = useTaskFiltering({
    initialTechnician: isWorkshopManager ? "all" : user?.id, // Workshop managers see all by default
    excludeStatus: "Completed,Ready for Pickup,Picked Up", // Exclude all finished statuses
    pageSize: 15,
    isWorkshopContext: isWorkshopManager,
    workshopUserId: isWorkshopManager ? user?.id : undefined // Pass actual user ID for workshop filter
  });

  // RE-visit "My Tasks" complex merging logic:
  // The original code merged "Assigned Tasks" and "Workshop Queue" (if isWorkshopManager).
  // Our hook doesn't support merging two API calls.
  // So for "My Tasks", we should probably stick to `useTasks` or a custom logic unless we want to change behavior.
  // However, consistent filtering is the goal.
  // Let's implement My Tasks using the hook for "Assigned To Me" for now, as that's 90% of cases.
  // Workshop Queue merging logic was: "Merge both assigned and workshop queue tasks"

  // Swipe handling
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    const currentIndex = TABS_ORDER.indexOf(activeTab);

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0 && currentIndex < TABS_ORDER.length - 1) {
        setActiveTab(TABS_ORDER[currentIndex + 1]);
      } else if (distance < 0 && currentIndex > 0) {
        setActiveTab(TABS_ORDER[currentIndex - 1]);
      }
    }
  };

  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  const deleteTaskMutation = useMutation({
    mutationFn: (taskTitle: string) => deleteTask(taskTitle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTaskMutation = useUpdateTask();

  const handleRowClick = (task: any) => {
    router.push(`/dashboard/tasks/${task.title}`);
  };

  const handleMyTaskRowClick = (task: any) => {
    router.push(`/dashboard/technician/tasks/${task.title}`);
  };

  const handleProcessPickup = (taskTitle: string) => {
    updateTaskMutation.mutate({ id: taskTitle, updates: { status: "Completed", current_location: "Completed", payment_status: "Paid" } });
    alert("Pickup processed successfully!");
  };

  const handleTerminateTask = (taskTitle: string) => {
    updateTaskMutation.mutate({ id: taskTitle, updates: { status: "Terminated" } });
  };

  const isLoading = pendingTasks.isLoading || completedTasks.isLoading || myTasks.isLoading;

  if (isLoading && pendingTasks.page === 1) { // Show skeleton only on initial load
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manager Tasks Portal</h1>
          <p className="text-gray-600 mt-2">Complete task management with Front Desk workflow capabilities</p>
        </div>
        <div className="flex gap-4">
          <Dialog open={isBrandModalOpen} onOpenChange={setIsBrandModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Brands
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Manage Brands</DialogTitle>
              </DialogHeader>
              <BrandManager />
            </DialogContent>
          </Dialog>
          <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
            <Link href="/dashboard/tasks/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Task
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content with Swipe Support */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Tab)}>
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="pending" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Current Tasks</TabsTrigger>
          <TabsTrigger value="myTasks" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">My Tasks</TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Completed</TabsTrigger>
        </TabsList>

        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <TabsContent value="pending">
            <TasksDisplay
              tasks={pendingTasks.tasks}
              technicians={pendingTasks.technicians}
              onRowClick={handleRowClick}
              showActions={false}
              onDeleteTask={deleteTaskMutation.mutate}
              onProcessPickup={handleProcessPickup}
              onTerminateTask={handleTerminateTask}
              isManagerView={true}
              searchQuery={pendingTasks.searchQuery}
              onSearchQueryChange={pendingTasks.setSearchQuery}
              serverSideFilters={pendingTasks.serverSideFilters}
              filterOptions={pendingTasks.filterOptions}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => pendingTasks.setPage(p => p - 1)} disabled={!pendingTasks.previous}>Previous</Button>
              <Button onClick={() => pendingTasks.setPage(p => p + 1)} disabled={!pendingTasks.next}>Next</Button>
            </div>
          </TabsContent>

          <TabsContent value="myTasks">
            <TasksDisplay
              tasks={myTasks.tasks}
              technicians={myTasks.technicians}
              onRowClick={handleMyTaskRowClick}
              showActions={false}
              isManagerView={false}
              isMyTasksTab={true}
              searchQuery={myTasks.searchQuery}
              onSearchQueryChange={myTasks.setSearchQuery}
              serverSideFilters={
                isWorkshopManager
                  ? myTasks.serverSideFilters  // Workshop managers: show technician filter
                  : {
                    ...myTasks.serverSideFilters,
                    technicianId: undefined,
                    setTechnicianId: undefined  // Normal managers: hide technician filter
                  }
              }
              filterOptions={myTasks.filterOptions}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => myTasks.setPage(p => p - 1)} disabled={!myTasks.previous}>Previous</Button>
              <Button onClick={() => myTasks.setPage(p => p + 1)} disabled={!myTasks.next}>Next</Button>
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <TasksDisplay
              tasks={completedTasks.tasks}
              technicians={completedTasks.technicians}
              onRowClick={handleRowClick}
              showActions={true}
              onDeleteTask={deleteTaskMutation.mutate}
              onProcessPickup={handleProcessPickup}
              isCompletedTab={true}
              isManagerView={true}
              searchQuery={completedTasks.searchQuery}
              onSearchQueryChange={completedTasks.setSearchQuery}
              serverSideFilters={completedTasks.serverSideFilters}
              filterOptions={completedTasks.filterOptions}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => completedTasks.setPage(p => p - 1)} disabled={!completedTasks.previous}>Previous</Button>
              <Button onClick={() => completedTasks.setPage(p => p + 1)} disabled={!completedTasks.next}>Next</Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
