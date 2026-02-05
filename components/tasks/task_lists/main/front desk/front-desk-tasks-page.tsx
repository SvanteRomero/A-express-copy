'use client';

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/core/button";
import { Plus } from "lucide-react";
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
import { useUpdateTask } from "@/hooks/use-tasks";
import {
  showTaskApprovalErrorToast,
  showPickupErrorToast,
  showPaymentRequiredToast,
} from "@/components/notifications/toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useCallback } from "react";
import { useTaskFiltering } from "@/hooks/use-task-filtering";
import Link from "next/link";

export function FrontDeskTasksPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Use independent hooks for each tab
  // 1. Not Completed
  const notCompletedTasks = useTaskFiltering({
    initialStatus: "Pending,In Progress",
    pageSize: 10
  });

  // 2. Completed
  const completedTasks = useTaskFiltering({
    initialStatus: "Completed",
    pageSize: 10
  });

  // 3. Ready for Pickup
  const pickupTasks = useTaskFiltering({
    initialStatus: "Ready for Pickup",
    pageSize: 10
  });

  const updateTaskMutation = useUpdateTask();
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  const handleRowClick = useCallback((task: any) => {
    router.push(`/dashboard/tasks/${task.title}`);
  }, [router]);

  const confirmApproval = async (task: any) => {
    if (!user) return;
    if (approvingTaskId) return;

    setApprovingTaskId(task.title);

    const updates: any = {
      status: "Ready for Pickup",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    };

    try {
      await updateTaskMutation.mutateAsync({
        id: task.title,
        updates,
      });
      // Toast handled via WebSocket
      // Invalidate queries? The hook relies on useTasks which uses react-query, 
      // so if we invalidate "tasks" key, all hooks should update.
      // useUpdateTask should probably handle invalidation or we do it here if needed.
    } catch (error) {
      showTaskApprovalErrorToast();
    } finally {
      setApprovingTaskId(null);
    }
  };

  const handleApprove = useCallback(async (taskTitle: string) => {
    if (user) {
      // Find the task from the completed tasks data
      const task = completedTasks.tasks.find((t: any) => t.title === taskTitle);

      if (!task) return;

      confirmApproval(task);
    }
  }, [user, completedTasks.tasks, approvingTaskId, updateTaskMutation]);

  const handleReject = useCallback(async (taskTitle: string, notes: string) => {
    updateTaskMutation.mutate({ id: taskTitle, updates: { status: "In Progress", note: notes, workshop_status: null } });
  }, [updateTaskMutation]);

  const [pickingUpTaskId, setPickingUpTaskId] = useState<string | null>(null);

  const handlePickedUp = useCallback(async (task: any) => {
    if (!task.is_terminated && task.payment_status !== 'Fully Paid' && !task.is_debt) {
      showPaymentRequiredToast();
      return;
    }
    if (user) {
      // Prevent double-clicks
      if (pickingUpTaskId) return;

      setPickingUpTaskId(task.title);

      try {
        await updateTaskMutation.mutateAsync({
          id: task.title,
          updates: {
            status: "Picked Up",
            date_out: new Date().toISOString(),
            sent_out_by: user.id,
          },
        });
        // Toast handled via WebSocket
      } catch (error) {
        showPickupErrorToast();
      } finally {
        setPickingUpTaskId(null);
      }
    }
  }, [updateTaskMutation, user, pickingUpTaskId]);

  const handleNotifyCustomer = useCallback((taskTitle: string, customerName: string) => {
    alert(`Notifying ${customerName} for task ${taskTitle}`);
  }, []);

  const isLoading = notCompletedTasks.isLoading || completedTasks.isLoading || pickupTasks.isLoading;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Front Desk Tasks</h1>
          <p className="text-gray-600 mt-2">Manage tasks assigned to the front desk.</p>
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

      <Tabs defaultValue="not-completed">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="not-completed" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Not Completed</TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Completed Tasks</TabsTrigger>
          <TabsTrigger value="pickup" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Ready For Pickup</TabsTrigger>
        </TabsList>
        <TabsContent value="not-completed">
          <TasksDisplay
            tasks={notCompletedTasks.tasks}
            technicians={notCompletedTasks.technicians}
            onRowClick={handleRowClick}
            showActions={false}
            isManagerView={true}
            searchQuery={notCompletedTasks.searchQuery}
            onSearchQueryChange={notCompletedTasks.setSearchQuery}
            serverSideFilters={notCompletedTasks.serverSideFilters}
            filterOptions={notCompletedTasks.filterOptions}
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button onClick={() => notCompletedTasks.setPage(p => p - 1)} disabled={!notCompletedTasks.previous}>Previous</Button>
            <Button onClick={() => notCompletedTasks.setPage(p => p + 1)} disabled={!notCompletedTasks.next}>Next</Button>
          </div>
        </TabsContent>
        <TabsContent value="completed">
          <TasksDisplay
            tasks={completedTasks.tasks}
            technicians={completedTasks.technicians}
            onRowClick={handleRowClick}
            showActions={true}
            onApprove={handleApprove}
            onReject={handleReject}
            isFrontDeskCompletedView={true}
            approvingTaskId={approvingTaskId}
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
        <TabsContent value="pickup">
          <TasksDisplay
            tasks={pickupTasks.tasks}
            technicians={pickupTasks.technicians}
            onRowClick={handleRowClick}
            showActions={true}
            isPickupView={true}
            onPickedUp={handlePickedUp}
            onNotifyCustomer={handleNotifyCustomer}
            pickingUpTaskId={pickingUpTaskId}
            searchQuery={pickupTasks.searchQuery}
            onSearchQueryChange={pickupTasks.setSearchQuery}
            serverSideFilters={pickupTasks.serverSideFilters}
            filterOptions={pickupTasks.filterOptions}
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button onClick={() => pickupTasks.setPage(p => p - 1)} disabled={!pickupTasks.previous}>Previous</Button>
            <Button onClick={() => pickupTasks.setPage(p => p + 1)} disabled={!pickupTasks.next}>Next</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
