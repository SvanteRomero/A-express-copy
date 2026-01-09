"use client";
import React, { useState } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { TasksDisplay } from "../../../task_utils/tasks-display";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addTaskPayment, sendDebtReminder, previewTemplateMessage } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/feedback/alert-dialog";
import { Loader2 } from "lucide-react";
import { PageSkeleton, TableSkeleton } from "@/components/ui/core/loaders";

const DebtsPage = () => {
  const { data: tasksData, isLoading, error } = useTasks({ debts: true });
  const router = useRouter();
  const queryClient = useQueryClient();

  // State for debt reminder dialog
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [previewMessage, setPreviewMessage] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const addTaskPaymentMutation = useMutation({
    mutationFn: ({ taskId, amount, methodId }: { taskId: string; amount: number; methodId: number }) =>
      addTaskPayment(taskId, { amount, method: methodId, date: new Date().toISOString().split('T')[0] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Payment Added",
        description: "The payment has been added successfully.",
      });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: (taskId: number) => sendDebtReminder(taskId),
    onSuccess: (data) => {
      toast({
        title: "Reminder Sent",
        description: `Debt reminder SMS sent to ${data.data?.recipient || 'customer'}.`,
      });
      setReminderDialogOpen(false);
      setSelectedTask(null);
      setPreviewMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send",
        description: error?.response?.data?.error || "Failed to send debt reminder SMS.",
        variant: "destructive",
      });
    },
  });

  const handleRowClick = (task: any) => {
    router.push(`/dashboard/tasks/${task.title}`);
  };

  const handleAddPayment = (taskId: string, amount: number, paymentMethodId: number) => {
    addTaskPaymentMutation.mutate({ taskId, amount, methodId: paymentMethodId });
  };

  const handleRemindDebt = async (taskId: string) => {
    // Find the task by title (taskId is actually the task title/display ID)
    const task = tasksData?.results?.find((t: any) => t.title === taskId);
    if (!task) {
      toast({
        title: "Error",
        description: "Could not find task details.",
        variant: "destructive",
      });
      return;
    }

    // Check if customer has a phone number
    const customer = task.customer_details || {};
    const phoneNumbers = customer.phone_numbers?.map((p: any) => p.phone_number) || [];
    const primaryPhone = phoneNumbers[0] || '';

    if (!primaryPhone) {
      toast({
        title: "No Phone Number",
        description: "This customer does not have a phone number on file.",
        variant: "destructive",
      });
      return;
    }

    setSelectedTask(task);
    setReminderDialogOpen(true);

    // Fetch message preview from backend
    setIsLoadingPreview(true);
    try {
      const result = await previewTemplateMessage(task.id.toString(), 'debt_reminder');
      if (result.success && result.message) {
        setPreviewMessage(result.message);
      } else {
        setPreviewMessage("Could not load message preview");
      }
    } catch (err) {
      setPreviewMessage("Could not load message preview");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConfirmSend = () => {
    if (selectedTask) {
      sendReminderMutation.mutate(selectedTask.id);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setReminderDialogOpen(false);
      setSelectedTask(null);
      setPreviewMessage("");
    }
  };

  // Get display info for the dialog
  const getCustomerName = () => {
    if (!selectedTask) return '';
    const customer = selectedTask.customer_details || {};
    return customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer';
  };

  const getCustomerPhone = () => {
    if (!selectedTask) return '';
    const customer = selectedTask.customer_details || {};
    const phoneNumbers = customer.phone_numbers?.map((p: any) => p.phone_number) || [];
    return phoneNumbers[0] || '';
  };

  if (isLoading) {
    return (
      <PageSkeleton>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
          <TableSkeleton rows={5} columns={6} />
        </div>
      </PageSkeleton>
    );
  }

  if (error) {
    return <div>Error loading tasks.</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Debts</h1>
      <p className="mb-4">Tasks that are "Picked Up" but not "Fully Paid".</p>
      <TasksDisplay
        tasks={tasksData?.results || []}
        technicians={[]}
        onRowClick={handleRowClick}
        showActions={true}
        onAddPayment={handleAddPayment}
        onRemindDebt={handleRemindDebt}
        isAccountantView={true}
      />

      {/* Debt Reminder Confirmation Dialog */}
      <AlertDialog open={reminderDialogOpen} onOpenChange={handleDialogClose}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Send Debt Reminder</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Send SMS reminder to:</p>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{getCustomerName()}</p>
                  <p className="text-muted-foreground">{getCustomerPhone()}</p>
                </div>
                <div className="p-3 bg-muted rounded-md text-sm min-h-[100px]">
                  {isLoadingPreview ? (
                    <div className="flex items-center justify-center h-[80px]">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{previewMessage}</p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendReminderMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSend}
              disabled={sendReminderMutation.isPending || isLoadingPreview}
            >
              {sendReminderMutation.isPending ? "Sending..." : "Send SMS"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DebtsPage;
