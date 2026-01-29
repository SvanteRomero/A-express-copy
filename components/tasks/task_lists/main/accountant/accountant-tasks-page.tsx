'use client';

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { deleteTask, addTaskPayment } from "@/lib/api-client";
import { TasksDisplay } from "@/components/tasks/task_utils/tasks-display";
import { useTasks } from "@/hooks/use-tasks";
import { useTechnicians } from "@/hooks/use-users";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/core/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AccountantTasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const { data: tasksData, isLoading, isError, error } = useTasks({
    unpaid_tasks: true,
    page,
    page_size: 15,
    search: searchQuery,
  });
  const { data: technicians } = useTechnicians();

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

  const tasks = tasksData?.results || [];
  const totalCount = tasksData?.count || 0;
  const totalPages = Math.ceil(totalCount / 15);
  const hasNext = !!tasksData?.next;
  const hasPrevious = !!tasksData?.previous;

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Accountant Tasks</h1>
          <p className="text-gray-600 mt-2">Tasks with outstanding payments.</p>
        </div>
        <div className="text-sm text-gray-500">
          {totalCount} total task{totalCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main Content */}
      <TasksDisplay
        tasks={tasks}
        technicians={technicians || []}
        onRowClick={handleRowClick}
        showActions={true}
        onAddPayment={handleAddPayment}
        isAccountantView={true}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchChange}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={!hasPrevious}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNext}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
