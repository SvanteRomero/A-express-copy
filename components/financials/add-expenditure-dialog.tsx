'use client'

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from '@/hooks/use-auth';
import { createExpenditureRequest, createAndApproveExpenditureRequest, getTasks, getPaymentCategories, getPaymentMethods } from '@/lib/api-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/feedback/dialog";
import { Button } from "@/components/ui/core/button";
import { Textarea } from "@/components/ui/core/textarea";
import { Label } from "@/components/ui/core/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select";
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/layout/popover";
import { CurrencyInput } from "@/components/ui/core/currency-input";

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
  const { toast } = useToast();
  const { register, handleSubmit, control, watch, formState: { errors }, setValue, reset } = useForm();

  const [openTaskCombobox, setOpenTaskCombobox] = useState(false)

  const { data: tasksData } = useQuery({ queryKey: ['tasks'], queryFn: () => getTasks({ limit: 1000 }) });
  const { data: categories } = useQuery({ queryKey: ['paymentCategories'], queryFn: getPaymentCategories });
  const { data: methods } = useQuery({ queryKey: ['paymentMethods'], queryFn: getPaymentMethods });

  const taskOptions = tasksData?.data.results.map((task: any) => ({ label: task.title, value: String(task.id) })) || [];

  useEffect(() => {
    if (isOpen) {
      if (mode === 'refund' && taskId) {
        setValue('task', taskId);
        setValue('description', `Refund for task: ${taskTitle}`);
        setValue('cost_type', 'Subtractive');
      }
    } else {
      reset();
    }
  }, [isOpen, mode, taskId, taskTitle, setValue, reset]);

  const isManager = user?.role === 'Manager';

  const mutation = useMutation({
    mutationFn: isManager ? createAndApproveExpenditureRequest : createExpenditureRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenditureRequests'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      toast({ title: "Success", description: `${mode === 'refund' ? 'Refund' : 'Expenditure'} request ${isManager ? 'created and approved' : 'created'} successfully.` });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.detail || `Failed to create ${mode === 'refund' ? 'refund' : 'expenditure'} request.`, variant: "destructive" });
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
                <Popover open={openTaskCombobox} onOpenChange={setOpenTaskCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openTaskCombobox}
                      className="w-full justify-between"
                      disabled={isRefundMode}
                    >
                      {field.value
                        ? taskOptions.find((task: { label: string; value: string; }) => task.value === field.value)?.label
                        : "Select task..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search tasks..." />
                      <CommandList>
                        <CommandEmpty>No task found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            key="null-task"
                            value="null"
                            onSelect={() => {
                              field.onChange('null');
                              setOpenTaskCombobox(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                            None
                          </CommandItem>
                          {taskOptions.map((task: { label: string; value: string; }) => (
                            <CommandItem
                              key={task.value}
                              value={task.label}
                              onSelect={(currentValue) => {
                                const selectedTask = taskOptions.find((opt: { label: string; value: string; }) => opt.label.toLowerCase() === currentValue.toLowerCase());
                                if (selectedTask) {
                                  field.onChange(selectedTask.value === field.value ? 'null' : selectedTask.value);
                                }
                                setOpenTaskCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === task.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {task.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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