'use client';

import { useState, useCallback } from "react";
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
import { useTasks, useUpdateTask } from "@/hooks/use-tasks";
import {
  showTaskApprovalErrorToast,
  showPickupErrorToast,
  showPaymentRequiredToast,
} from "@/components/notifications/toast";
import { useTechnicians } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";

type PageState = {
  "not-completed": number;
  completed: number;
  pickup: number;
};

export function FrontDeskTasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [pages, setPages] = useState<PageState>({
    "not-completed": 1,
    completed: 1,
    pickup: 1,
  });

  const { data: notCompletedTasksData, isLoading: isLoadingNotCompleted } = useTasks({
    page: pages["not-completed"],
    status: "Pending,In Progress",
  });

  const { data: completedTasksData, isLoading: isLoadingCompleted } = useTasks({
    page: pages.completed,
    status: "Completed",
  });

  const { data: pickupTasksData, isLoading: isLoadingPickup } = useTasks({
    page: pages.pickup,
    status: "Ready for Pickup",
  });

  const { data: technicians } = useTechnicians();
  const updateTaskMutation = useUpdateTask();
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [statusDialogTask, setStatusDialogTask] = useState<any>(null);

  const handleRowClick = useCallback((task: any) => {
    router.push(`/dashboard/tasks/${task.title}`);
  }, [router]);

  const confirmApproval = async (task: any, statusOverride?: string) => {
    if (!user) return;
    if (approvingTaskId) return;

    setApprovingTaskId(task.title);
    setStatusDialogTask(null); // Close dialog if open

    const updates: any = {
      status: "Ready for Pickup",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    };

    if (statusOverride) {
      updates.workshop_status = statusOverride;
    } else if (!task.workshop_status) {
      // Fallback if somehow called without status and task has none (shouldn't happen with new flow)
      updates.workshop_status = 'Solved';
    }

    try {
      await updateTaskMutation.mutateAsync({
        id: task.title,
        updates,
      });
      // Toast handled via WebSocket
    } catch (error) {
      showTaskApprovalErrorToast();
    } finally {
      setApprovingTaskId(null);
    }
  };

  const handleApprove = useCallback(async (taskTitle: string) => {
    if (user) {
      // Find the task from the completed tasks data
      const task = completedTasksData?.results?.find((t: any) => t.title === taskTitle);

      if (!task) return;

      if (!task.workshop_status) {
        setStatusDialogTask(task);
      } else {
        confirmApproval(task);
      }
    }
  }, [user, completedTasksData, approvingTaskId, updateTaskMutation]);

  const handleReject = useCallback(async (taskTitle: string, notes: string) => {
    updateTaskMutation.mutate({ id: taskTitle, updates: { status: "In Progress", qc_notes: notes, workshop_status: null } });
  }, [updateTaskMutation]);

  const [pickingUpTaskId, setPickingUpTaskId] = useState<string | null>(null);

  const handlePickedUp = useCallback(async (task: any) => {
    if (task.payment_status !== 'Fully Paid' && !task.is_debt) {
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

  const handlePageChange = (tab: keyof PageState, direction: 'next' | 'previous') => {
    setPages(prev => ({
      ...prev,
      [tab]: direction === 'next' ? prev[tab] + 1 : prev[tab] - 1,
    }));
  };

  const isLoading = isLoadingNotCompleted || isLoadingCompleted || isLoadingPickup;

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
            <a href="/dashboard/tasks/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Task
            </a>
          </Button>
        </div>
      </div>

      <Dialog open={!!statusDialogTask} onOpenChange={(open) => !open && setStatusDialogTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Specify Final Task Status</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
                 Is this task solved or not solved? Please specify the outcome of the repair.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                variant="outline" 
                className="w-full border-red-200 hover:bg-red-50 text-red-700"
                onClick={() => confirmApproval(statusDialogTask, 'Not Solved')}
              >
                Not Solved
              </Button>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => confirmApproval(statusDialogTask, 'Solved')}
              >
                Solved
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="not-completed">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="not-completed" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Not Completed</TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Completed Tasks</TabsTrigger>
          <TabsTrigger value="pickup" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Ready For Pickup</TabsTrigger>
        </TabsList>
        <TabsContent value="not-completed">
          <TasksDisplay
            tasks={notCompletedTasksData?.results || []}
            technicians={technicians || []}
            onRowClick={handleRowClick}
            showActions={false}
            isManagerView={true}
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button onClick={() => handlePageChange('not-completed', 'previous')} disabled={!notCompletedTasksData?.previous}>Previous</Button>
            <Button onClick={() => handlePageChange('not-completed', 'next')} disabled={!notCompletedTasksData?.next}>Next</Button>
          </div>
        </TabsContent>
        <TabsContent value="completed">
          <TasksDisplay
            tasks={completedTasksData?.results || []}
            technicians={technicians || []}
            onRowClick={handleRowClick}
            showActions={true}
            onApprove={handleApprove}
            onReject={handleReject}
            isFrontDeskCompletedView={true}
            approvingTaskId={approvingTaskId}
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button onClick={() => handlePageChange('completed', 'previous')} disabled={!completedTasksData?.previous}>Previous</Button>
            <Button onClick={() => handlePageChange('completed', 'next')} disabled={!completedTasksData?.next}>Next</Button>
          </div>
        </TabsContent>
        <TabsContent value="pickup">
          <TasksDisplay
            tasks={pickupTasksData?.results || []}
            technicians={technicians || []}
            onRowClick={handleRowClick}
            showActions={true}
            isPickupView={true}
            onPickedUp={handlePickedUp}
            onNotifyCustomer={handleNotifyCustomer}
            pickingUpTaskId={pickingUpTaskId}
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button onClick={() => handlePageChange('pickup', 'previous')} disabled={!pickupTasksData?.previous}>Previous</Button>
            <Button onClick={() => handlePageChange('pickup', 'next')} disabled={!pickupTasksData?.next}>Next</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
