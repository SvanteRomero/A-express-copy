'use client';

import { useTasks } from '@/hooks/use-tasks';
import { TasksDisplay } from './tasks-display';
import { useRouter } from 'next/navigation';

export default function AccountantHistoryPage() {
  const { data: tasks, isLoading, isError, error } = useTasks();
  const router = useRouter();

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

  const fullyPaidTasks = tasks?.results?.filter(task => task.payment_status === 'Fully Paid') || [];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Accountant History</h1>
          <p className="text-gray-600 mt-2">A list of all fully paid tasks.</p>
        </div>
      </div>
      <TasksDisplay tasks={fullyPaidTasks} technicians={[]} onRowClick={handleRowClick} showActions={false} />
    </div>
  );
}
