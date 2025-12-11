import { TaskHistoryPage } from "@/components/tasks/task_lists/history/task-history-page";

export default function ManagerHistoryPage() {
  return (
    <TaskHistoryPage
      title="Manager Task History"
      description="View all completed and terminated tasks."
      statusFilter="Picked Up,Terminated"
      isManagerView={true}
    />
  );
}

