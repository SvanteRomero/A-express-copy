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
import { useTasks, useUpdateTask } from "@/hooks/use-tasks";
import { useAssignableUsers } from "@/hooks/use-users";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/ui/core/loaders";

type Tab = 'pending' | 'completed' | 'myTasks';
const TABS_ORDER: Tab[] = ['pending', 'myTasks', 'completed'];

export function ManagerTasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [pages, setPages] = useState({
    pending: 1,
    completed: 1,
    myTasks: 1,
  });

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
        // Swipe left - go to next tab
        setActiveTab(TABS_ORDER[currentIndex + 1]);
      } else if (distance < 0 && currentIndex > 0) {
        // Swipe right - go to previous tab
        setActiveTab(TABS_ORDER[currentIndex - 1]);
      }
    }
  };

  const { data: pendingTasksData, isLoading: isLoadingPending } = useTasks({
    page: pages.pending,
    status: "Pending,In Progress,Awaiting Parts,Assigned - Not Accepted,Diagnostic",
  });


  const { data: completedTasksData, isLoading: isLoadingCompleted } = useTasks({
    page: pages.completed,
    status: "Completed,Ready for Pickup",
  });

  // My Tasks - tasks assigned to this manager
  const isWorkshopManager = user?.is_workshop || false;

  // For workshop managers, fetch both assigned tasks AND workshop queue tasks
  const { data: assignedTasksData, isLoading: isLoadingAssigned } = useTasks({
    page: pages.myTasks,
    assigned_to: user?.id,
    status: "In Progress,Pending,Awaiting Parts,Assigned - Not Accepted,Diagnostic",
  });

  // Workshop queue tasks (only for workshop managers)
  const shouldFetchWorkshopQueue = isWorkshopManager;
  const { data: workshopQueueData, isLoading: isLoadingWorkshop } = useTasks(
    shouldFetchWorkshopQueue ? {
      page: pages.myTasks,
      workshop_status: 'In Workshop',
      status: "In Progress,Pending,Awaiting Parts,Assigned - Not Accepted,Diagnostic",
    } : { page: 1 }  // Dummy query when not needed
  );

  // Merge tasks for workshop managers, or just use assigned tasks for regular managers
  const myTasksData = React.useMemo(() => {
    if (isWorkshopManager) {
      // Merge both assigned and workshop queue tasks
      if (!assignedTasksData && !workshopQueueData) return undefined;

      const assignedResults = assignedTasksData?.results || [];
      const workshopResults = workshopQueueData?.results || [];

      // Use Map to deduplicate by task ID
      const taskMap = new Map();
      [...assignedResults, ...workshopResults].forEach(task => {
        taskMap.set(task.id, task);
      });

      return {
        count: taskMap.size,
        results: Array.from(taskMap.values()),
        next: null,
        previous: null,
      };
    }
    return assignedTasksData;
  }, [isWorkshopManager, assignedTasksData, workshopQueueData]);

  const isLoadingMyTasks = isWorkshopManager
    ? (isLoadingAssigned || isLoadingWorkshop)
    : isLoadingAssigned;

  const { data: technicians } = useAssignableUsers();

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

  // Special handler for My Tasks - navigate to technician task details
  const handleMyTaskRowClick = (task: any) => {
    router.push(`/dashboard/technician/tasks/${task.title}`);
  };

  const handleProcessPickup = (taskTitle: string) => {
    updateTaskMutation.mutate({ id: taskTitle, updates: { status: "Completed", current_location: "Completed", payment_status: "Paid" } });
    alert("Pickup processed successfully!");
  };

  const handleApprove = (taskTitle: string) => {
    updateTaskMutation.mutate({ id: taskTitle, updates: { status: "Completed" } });
  };

  const handleReject = (taskTitle: string, notes: string) => {
    updateTaskMutation.mutate({ id: taskTitle, updates: { status: "In Progress", qc_notes: notes } });
  };

  const handleTerminateTask = (taskTitle: string) => {
    updateTaskMutation.mutate({ id: taskTitle, updates: { status: "Terminated" } });
  };

  const handlePageChange = (tab: Tab, direction: 'next' | 'previous') => {
    setPages(prev => ({
      ...prev,
      [tab]: direction === 'next' ? prev[tab] + 1 : prev[tab] - 1,
    }));
  };

  const isLoading = isLoadingPending || isLoadingCompleted || isLoadingMyTasks;

  if (isLoading) {
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
            <a href="/dashboard/tasks/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Task
            </a>
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

        {/* Swipeable content area */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <TabsContent value="pending">
            <TasksDisplay
              tasks={pendingTasksData?.results || []}
              technicians={technicians || []}
              onRowClick={handleRowClick}
              showActions={false}
              onDeleteTask={deleteTaskMutation.mutate}
              onProcessPickup={handleProcessPickup}
              onTerminateTask={handleTerminateTask}
              isManagerView={true}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => handlePageChange('pending', 'previous')} disabled={!pendingTasksData?.previous}>Previous</Button>
              <Button onClick={() => handlePageChange('pending', 'next')} disabled={!pendingTasksData?.next}>Next</Button>
            </div>
          </TabsContent>
          <TabsContent value="myTasks">
            <TasksDisplay
              tasks={myTasksData?.results || []}
              technicians={technicians || []}
              onRowClick={handleMyTaskRowClick}
              showActions={false}
              isManagerView={false}
              isMyTasksTab={true}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => handlePageChange('myTasks', 'previous')} disabled={!myTasksData?.previous}>Previous</Button>
              <Button onClick={() => handlePageChange('myTasks', 'next')} disabled={!myTasksData?.next}>Next</Button>
            </div>
          </TabsContent>
          <TabsContent value="completed">
            <TasksDisplay
              tasks={completedTasksData?.results || []}
              technicians={technicians || []}
              onRowClick={handleRowClick}
              showActions={true}
              onDeleteTask={deleteTaskMutation.mutate}
              onProcessPickup={handleProcessPickup}
              isCompletedTab={true}
              isManagerView={true}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={() => handlePageChange('completed', 'previous')} disabled={!completedTasksData?.previous}>Previous</Button>
              <Button onClick={() => handlePageChange('completed', 'next')} disabled={!completedTasksData?.next}>Next</Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
