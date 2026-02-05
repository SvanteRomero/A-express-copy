'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/core/button";
import { TasksDisplay } from "../../task_utils/tasks-display";
import { useTaskFiltering } from "@/hooks/use-task-filtering";
import { useTechnicians } from "@/hooks/use-users";
import { ReturnTaskDialog } from "../../return-task-dialog";

interface GenericTaskHistoryPageProps {
  title: string;
  description: string;
  statusFilter: string;
  showDateFilter?: boolean;
  isFrontDeskView?: boolean;
  isManagerView?: boolean;
}

export function TaskHistoryPage({
  title,
  description,
  statusFilter,
  showDateFilter = false,
  isFrontDeskView = false,
  isManagerView = false,
}: GenericTaskHistoryPageProps) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const {
    tasks,
    isLoading,
    isError,
    error,
    page,
    setPage,
    next,
    previous,
    searchQuery,
    setSearchQuery,
    serverSideFilters,
    filterOptions
  } = useTaskFiltering({
    initialStatus: statusFilter,
    initialPage: 1,
    pageSize: 10,
    // Add date filter if needed, currently useTaskFiltering might need update for updated_at_after
    // But since it accepts extraParams, we can pass it there.
    extraParams: {
      updated_at_after: showDateFilter && !showAll ? twoWeeksAgo.toISOString().split('T')[0] : undefined
    }
  });

  const { data: technicians } = useTechnicians();
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const handleRowClick = (task: any) => {
    router.push(`/dashboard/tasks/${task.title}`);
  };

  const handleReturnTask = (task: any) => {
    setSelectedTask(task);
    setIsReturnDialogOpen(true);
  };

  // const tasks = useMemo(() => tasksData?.results || [], [tasksData]); // No longer needed

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
        <div className="text-red-500">Error: {(error as any)?.message}</div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-2">{description}</p>
        </div>
      </div>

      <TasksDisplay
        tasks={tasks}
        technicians={technicians || []}
        onRowClick={handleRowClick}
        showActions={true}
        isHistoryView={true}
        onReturnTask={isFrontDeskView ? handleReturnTask : undefined}
        isCompletedTab={true}
        isManagerView={isManagerView}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        serverSideFilters={serverSideFilters}
        filterOptions={filterOptions}
      />

      <div className="flex justify-end space-x-2 mt-4">
        <Button onClick={() => setPage(page - 1)} disabled={!previous}>Previous</Button>
        <Button onClick={() => setPage(page + 1)} disabled={!next}>Next</Button>
      </div>

      {selectedTask && isFrontDeskView && (
        <ReturnTaskDialog
          task={selectedTask}
          isOpen={isReturnDialogOpen}
          onClose={() => setIsReturnDialogOpen(false)}
        />
      )}
    </div>
  );
}
