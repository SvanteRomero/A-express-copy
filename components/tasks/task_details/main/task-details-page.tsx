'use client'

import { TaskNotes } from "@/components/tasks/task_details/main/task-notes";
import CustomerInformation from "@/components/tasks/task_details/main/customer-information";
import LaptopInformation from "@/components/tasks/task_details/main/laptop-information";
import RepairManagement from "@/components/tasks/task_details/main/repair-management";
import Financials from "@/components/tasks/task_details/main/financials";
import TaskHeader from "@/components/tasks/task_details/main/task-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs";
import { useTask } from "@/hooks/use-tasks";
import { TaskActivityLog } from "@/components/tasks/task_details/main/task-activity-log";
import { PageSkeleton } from "@/components/ui/core/loaders";

interface TaskDetailsPageProps {
  taskId: string;
}

export function TaskDetailsPage({ taskId }: TaskDetailsPageProps) {
  const { data: taskData, isLoading, isError, error } = useTask(taskId);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  if (!taskData) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:space-y-6 md:p-6">
      <TaskHeader taskId={taskId} />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-gray-100">
          <TabsTrigger value="overview" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="repair-management" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Repair Management
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            History
          </TabsTrigger>
          <TabsTrigger value="financials" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Financials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <CustomerInformation taskId={taskId} />
            <LaptopInformation taskId={taskId} />
          </div>
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Initial Issue Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-gray-900 leading-relaxed">{taskData.description}</p>
              </div>
            </CardContent>
          </Card>
          {taskData.activities?.filter((activity: any) => activity.message.startsWith('Returned with new issue:')).length > 0 && (
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Returned Issue Descriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {taskData.activities
                    .filter((activity: any) => activity.message.startsWith('Returned with new issue:'))
                    .map((activity: any) => (
                      <div key={activity.id} className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <p className="text-gray-900 leading-relaxed">{activity.message.replace('Returned with new issue: ', '')}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Reported by {activity.user?.full_name || 'System'} on {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="repair-management" className="space-y-6">
          <div className="grid gap-6">
            <RepairManagement taskId={taskId} />
            <TaskNotes taskId={taskId} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1">
            <TaskActivityLog taskId={taskId} />
          </div>
        </TabsContent>

        <TabsContent value="financials" className="space-y-6">
          <Financials taskId={taskId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}