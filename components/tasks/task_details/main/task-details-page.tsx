'use client'

import { useState, useRef, TouchEvent } from "react";
import { TaskNotes } from "@/components/tasks/task_details/main/task-notes";
import CustomerInformation from "@/components/tasks/task_details/main/customer-information";
import LaptopInformation from "@/components/tasks/task_details/main/laptop-information";
import RepairManagement from "@/components/tasks/task_details/main/repair-management";
import Financials from "@/components/tasks/task_details/main/financials";
import TaskHeader from "@/components/tasks/task_details/main/task-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { useTask } from "@/hooks/use-tasks";
import { TaskActivityLog } from "@/components/tasks/task_details/main/task-activity-log";
import { PageSkeleton } from "@/components/ui/core/loaders";
import { FileText, Wrench, History, DollarSign } from "lucide-react";

interface TaskDetailsPageProps {
  taskId: string;
}

const TABS = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "repair-management", label: "Repair Management", icon: Wrench },
  { id: "history", label: "History", icon: History },
  { id: "financials", label: "Financials", icon: DollarSign },
] as const;

type TabId = typeof TABS[number]["id"];

export function TaskDetailsPage({ taskId }: TaskDetailsPageProps) {
  const { data: taskData, isLoading, isError, error } = useTask(taskId);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // minimum swipe distance

    if (Math.abs(diff) > threshold) {
      const currentIndex = TABS.findIndex(t => t.id === activeTab);
      if (diff > 0 && currentIndex < TABS.length - 1) {
        // Swipe left - go to next tab
        setActiveTab(TABS[currentIndex + 1].id);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - go to previous tab
        setActiveTab(TABS[currentIndex - 1].id);
      }
    }
  };

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

      <div className="space-y-4 md:space-y-6">
        {/* Tab Navigation */}
        <div className="grid grid-cols-4 w-full bg-gray-100 rounded-lg p-1 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive
                    ? "bg-red-600 text-white"
                    : "text-gray-600 hover:bg-gray-200"
                  }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content with Swipe Support */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="min-h-[300px]"
        >
          {activeTab === "overview" && (
            <div className="space-y-6">
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
            </div>
          )}

          {activeTab === "repair-management" && (
            <div className="grid gap-6">
              <RepairManagement taskId={taskId} />
              <TaskNotes taskId={taskId} />
            </div>
          )}

          {activeTab === "history" && (
            <div className="grid gap-6 md:grid-cols-1">
              <TaskActivityLog taskId={taskId} />
            </div>
          )}

          {activeTab === "financials" && (
            <Financials taskId={taskId} />
          )}
        </div>
      </div>
    </div>
  );
}