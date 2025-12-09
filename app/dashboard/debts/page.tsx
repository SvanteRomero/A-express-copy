"use client";
import DebtsPage from "@/components/tasks/task_lists/main/accountant/debts-page";
import { DashboardLayout } from "@/components/dashboard/layouts/dashboard-layout";

const Debts = () => {
  return (
    <DashboardLayout>
      <DebtsPage />
    </DashboardLayout>
  );
};

export default Debts;
