"use client";
import React from "react";
import { useTasks } from "@/hooks/use-tasks";
import { TasksDisplay } from "../../../tasks-display";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addTaskPayment } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";

const DebtsPage = () => {
  const { data: tasksData, isLoading, error } = useTasks({ debts: true });
  const router = useRouter();
  const queryClient = useQueryClient();

  const addTaskPaymentMutation = useMutation({
    mutationFn: ({ taskId, amount, methodId }: { taskId: string; amount: number; methodId: number }) => 
      addTaskPayment(taskId, { amount, method: methodId, date: new Date().toISOString().split('T')[0] }),
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
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading tasks.</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Debts</h1>
      <p className="mb-4">Tasks that are "Picked Up" but not "Fully Paid".</p>
      <TasksDisplay
        tasks={tasksData?.results || []}
        technicians={[]}
        onRowClick={handleRowClick}
        showActions={true}
        onAddPayment={handleAddPayment}
        onRemindDebt={() => {}}
        isAccountantView={true}
      />
    </div>
  );
};

export default DebtsPage;
