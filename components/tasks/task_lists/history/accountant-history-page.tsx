'use client';

import { useState } from "react";
import { useTasks } from '@/hooks/use-tasks';
import { TasksDisplay } from '../../task_utils/tasks-display';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/core/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AccountantHistoryPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data: tasksData, isLoading, isError, error } = useTasks({
    payment_status: 'Fully Paid',
    page,
    page_size: 15,
  });

  const handleRowClick = (task: any) => {
    router.push(`/dashboard/tasks/${task.title}`);
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Accountant History</h1>
          <p className="text-gray-600 mt-2">A list of all fully paid tasks.</p>
        </div>
        <div className="text-sm text-gray-500">
          {totalCount} total task{totalCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main Content */}
      <TasksDisplay tasks={tasks} technicians={[]} onRowClick={handleRowClick} showActions={false} />

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
