import { TaskHistoryPage } from "@/components/tasks/task_lists/history/task-history-page";
import { DashboardLayout } from "@/components/dashboard/layouts/dashboard-layout";

export default function ManagerHistoryPage() {
  return (
    <DashboardLayout>
      <TaskHistoryPage
        title="Manager Task History"
        description="View all completed and terminated tasks."
        statusFilter="Picked Up,Terminated"
        isManagerView={true}
      />
    </DashboardLayout>
  );
}
