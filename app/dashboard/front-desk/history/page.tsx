import { DashboardLayout } from "@/components/dashboard/layouts/dashboard-layout";
import { TaskHistoryPage } from "@/components/tasks/task_lists/history/task-history-page";

export default function FrontDeskHistory() {
  return (
    <DashboardLayout>
      <TaskHistoryPage
        title="Front Desk History"
        description="View completed and picked up tasks."
        statusFilter="Picked Up"
        showDateFilter={true}
        isFrontDeskView={true}
      />
    </DashboardLayout>
  );
}
