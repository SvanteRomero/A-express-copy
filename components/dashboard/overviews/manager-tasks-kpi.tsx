
"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/layout/card";
import { ClipboardList, Package } from "lucide-react";

interface DashboardKpiData {
  kpiData: {
    totalActiveTasks: number;
    revenueThisMonth: number;
    tasksReadyForPickup: number;
  };
}

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

export function ManagerTasksKpi() {
  const { data, isLoading, error } = useSWR<DashboardKpiData>(
    "/reports/dashboard-data/",
    fetcher
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading tasks</div>;
  }

  const kpiData = data?.kpiData;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpiData?.totalActiveTasks ?? 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Tasks Ready for Pickup
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpiData?.tasksReadyForPickup ?? 0}</div>
        </CardContent>
      </Card>
    </>
  )
}
