'use client';

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/core/button";
import { Plus } from "lucide-react";
import { TasksDisplay } from "./tasks-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs";
import { useTasks, useUpdateTask } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";
import { useTechnicians } from "@/hooks/use-data";
import { useAuth } from "@/lib/auth-context";

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
  const { toast } = useToast();

  const handleRowClick = useCallback((task: any) => {
    router.push(`/dashboard/tasks/${task.title}`);
  }, [router]);

  const handleApprove = useCallback(async (taskTitle: string) => {
    if (user) {
      updateTaskMutation.mutate({
        id: taskTitle,
        updates: {
          status: "Ready for Pickup",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        },
      });
    }
  }, [updateTaskMutation, user]);

  const handleReject = useCallback(async (taskTitle: string, notes: string) => {
    updateTaskMutation.mutate({ id: taskTitle, updates: { status: "In Progress", qc_notes: notes, workshop_status: null } });
  }, [updateTaskMutation]);

  const handlePickedUp = useCallback(async (task: any) => {
    if (task.payment_status !== 'Fully Paid' && !task.is_debt) {
      toast({
        title: "Payment Required",
        description: "This task cannot be marked as picked up until it is fully paid. Please contact the manager for assistance.",
        variant: "destructive",
      });
      return;
    }
    if (user) {
      updateTaskMutation.mutate({
        id: task.title,
        updates: {
          status: "Picked Up",
          date_out: new Date().toISOString(),
          sent_out_by: user.id,
        },
      });
    }
  }, [updateTaskMutation, user, toast]);

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
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Front Desk Tasks</h1>
          <p className="text-gray-600 mt-2">Manage tasks assigned to the front desk.</p>
        </div>
        <div className="flex gap-4">
          <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
            <a href="/dashboard/tasks/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Task
            </a>
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
