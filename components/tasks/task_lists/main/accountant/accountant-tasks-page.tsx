'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { deleteTask, addTaskPayment } from "@/lib/api-client";
import { TasksDisplay } from "@/components/tasks/task_utils/tasks-display";
import { useTasks } from "@/hooks/use-tasks";
import { useTechnicians } from "@/hooks/use-users";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export default function AccountantTasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading, isError, error } = useTasks();
  const { data: technicians } = useTechnicians();

  const addTaskPaymentMutation = useMutation({
    mutationFn: ({ taskId, amount, methodId }: { taskId: string; amount: number; methodId: number }) =>
      addTaskPayment(taskId, { amount, method: methodId, date: new Date().toISOString().split('T')[0], category: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Payment Added",
        description: "The payment has been added successfully.",
      });
    },
  });

  const handleRowClick = (task: any) => {
    router.push(`/dashboard/tasks/${task.title}`);
  };

  const handleAddPayment = (taskId: string, amount: number, paymentMethodId: number) => {
    addTaskPaymentMutation.mutate({ taskId, amount, methodId: paymentMethodId });
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="text-red-500">Error: {error.message}</div>
      </div>
    )
  }

  const unpaidTasks = tasks?.results?.filter(task => task.payment_status !== "Fully Paid" && task.status !== "Picked Up") || [];

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Accountant Tasks</h1>
          <p className="text-gray-600 mt-2">Tasks with outstanding payments.</p>
        </div>
      </div>

      {/* Main Content */}
      <TasksDisplay
        tasks={unpaidTasks}
        technicians={technicians || []}
        onRowClick={handleRowClick}
        showActions={true}
        onAddPayment={handleAddPayment}
        isAccountantView={true}
      />
    </div>
  );
}
