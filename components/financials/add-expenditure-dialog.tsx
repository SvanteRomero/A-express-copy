'use client'

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { createExpenditureRequest, createAndApproveExpenditureRequest, getPaymentCategories, getPaymentMethods } from '@/lib/api-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/feedback/dialog";
import { Button } from "@/components/ui/core/button";
import { Textarea } from "@/components/ui/core/textarea";
import { Label } from "@/components/ui/core/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select";
import {
  showExpenditureRequestCreatedToast,
  showExpenditureRequestErrorToast,
} from '@/components/notifications/toast';
import { CurrencyInput } from "@/components/ui/core/currency-input";
import { SimpleCombobox } from "@/components/ui/core/combobox";
import { useTasksSearch } from '@/hooks/use-tasks-search';

interface AddExpenditureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'expenditure' | 'refund';
  taskId?: string;
  taskTitle?: string;
}

export function AddExpenditureDialog({ isOpen, onClose, mode = 'expenditure', taskId, taskTitle }: AddExpenditureDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { register, handleSubmit, control, watch, formState: { errors }, setValue, reset } = useForm();

  const [taskSearch, setTaskSearch] = useState("")

  // Use the new search hook - only fetches when user types or when pre-filling
  const { data: tasksData, isLoading: isLoadingTasks } = useTasksSearch({
    query: taskSearch,
    enabled: isOpen
  });

  const { data: categories } = useQuery({ queryKey: ['paymentCategories'], queryFn: getPaymentCategories });
  const { data: methods } = useQuery({ queryKey: ['paymentMethods'], queryFn: getPaymentMethods });

  // Map search results to options
  const taskOptions = [
    { label: "None", value: "null" },
    ...(tasksData?.results.map((task: any) => ({ label: task.title, value: String(task.id) })) || [])
  ];

  useEffect(() => {
    if (isOpen) {
      if (mode === 'refund' && taskId) {
        setValue('task', taskId);
        setValue('description', `Refund for task: ${taskTitle}`);
        setValue('cost_type', 'Subtractive');
        // Pre-fill the search input with the task title so it shows up correctly
        if (taskTitle) setTaskSearch(taskTitle);
      }
    } else {
      reset();
      setTaskSearch(""); // Reset search on close
    }
  }, [isOpen, mode, taskId, taskTitle, setValue, reset]);

  const isManager = user?.role === 'Manager';
  const isRefund = mode === 'refund';

  const mutation = useMutation({
    mutationFn: isManager ? createAndApproveExpenditureRequest : createExpenditureRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenditureRequests'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      showExpenditureRequestCreatedToast(isRefund, isManager);
      onClose();
    },
    onError: (error: any) => {
      showExpenditureRequestErrorToast(isRefund, error.response?.data?.detail);
    },
  });

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      task: data.task === 'null' ? null : data.task,
    };
    mutation.mutate(payload);
  };

  const selectedTask = watch('task');
  const isRefundMode = mode === 'refund';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isRefundMode ? 'Request Refund' : 'Add New Expenditure'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description', { required: true })} disabled={isRefundMode} />
            {errors.description && <p className="text-red-500 text-xs">Description is required.</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Controller
              name="amount"
              control={control}
              rules={{ required: true, min: 1 }}
              render={({ field }) => (
                <CurrencyInput
                  id="amount"
                  placeholder="Enter amount"
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            {errors.amount && <p className="text-red-500 text-xs">Amount is required.</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task">Task (Optional)</Label>
            <Controller
              name="task"
              control={control}
              render={({ field }) => (
                <SimpleCombobox
                  options={taskOptions}
                  value={taskSearch}
                  placeholder="Search tasks..."
                  onInputChange={(val) => setTaskSearch(val)}
                  onChange={(val) => field.onChange(val)}
                  disabled={isRefundMode}
                />
              )}
            />
          </div>
          {selectedTask && selectedTask !== 'null' && (
            <div className="grid gap-2">
              <Label htmlFor="cost_type">Cost Type</Label>
              <Controller
                name="cost_type"
                control={control}
                defaultValue="Inclusive"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isRefundMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isRefundMode ? (
                        <SelectItem value="Subtractive">Subtractive (Refund to customer)</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="Inclusive">Inclusive (part of original quote)</SelectItem>
                          <SelectItem value="Additive">Additive (will be added to final bill)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="category_id">Payment Category</Label>
            <Controller
              name="category_id"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.data.map((category: any) => (
                      <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category_id && <p className="text-red-500 text-xs">Category is required.</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment_method_id">Payment Method</Label>
            <Controller
              name="payment_method_id"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a method..." />
                  </SelectTrigger>
                  <SelectContent>
                    {methods?.data.map((method: any) => (
                      <SelectItem key={method.id} value={String(method.id)}>{method.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.payment_method_id && <p className="text-red-500 text-xs">Payment method is required.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}