'use client';

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { addTaskPayment } from "@/lib/api-client";
import { TasksDisplay } from "@/components/tasks/task_utils/tasks-display";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/core/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTaskFiltering } from "@/hooks/use-task-filtering";

export default function AccountantTasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // useTasks from hooks/use-tasks accepts unpaid_tasks via extraParams
  const {
    tasks,
    count,
    isLoading,
    isError,
    error,
    page,
    setPage,
    searchQuery,
    setSearchQuery,
    serverSideFilters,
    filterOptions,
    technicians,
    next,
    previous
  } = useServerSideTaskFiltering({
    pageSize: 15,
    extraParams: { unpaid_tasks: true }
  });

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

  if (isLoading && page === 1) {
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
        <div className="text-red-500">Error: {error?.message}</div>
      </div>
    )
  }

  const totalPages = Math.ceil(count / 15);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Accountant Tasks</h1>
          <p className="text-gray-600 mt-2">Tasks with outstanding payments.</p>
        </div>
        <div className="text-sm text-gray-500">
          {count} total task{count !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main Content */}
      <TasksDisplay
        tasks={tasks}
        technicians={technicians}
        onRowClick={handleRowClick}
        showActions={true}
        onAddPayment={handleAddPayment}
        isAccountantView={true}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        serverSideFilters={serverSideFilters}
        filterOptions={filterOptions}
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
              disabled={!previous}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!next}
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
