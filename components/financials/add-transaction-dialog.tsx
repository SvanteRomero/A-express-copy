'use client'

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { createTransactionRequest, getPaymentCategories, getPaymentMethods, listManagers } from '@/lib/api-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/feedback/dialog";
import { Button } from "@/components/ui/core/button";
import { Textarea } from "@/components/ui/core/textarea";
import { Label } from "@/components/ui/core/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select";
import {
    showTransactionRequestCreatedToast,
    showTransactionRequestErrorToast,
} from '@/components/notifications/toast';
import { CurrencyInput } from "@/components/ui/core/currency-input";
import { SimpleCombobox } from "@/components/ui/core/combobox";
import { useTasksSearch } from '@/hooks/use-tasks-search';

type TransactionType = 'Expenditure' | 'Revenue';

interface AddTransactionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    defaultType?: TransactionType;
    mode?: 'normal' | 'refund';
    taskId?: string;
    taskTitle?: string;
}

export function AddTransactionDialog({
    isOpen,
    onClose,
    defaultType = 'Expenditure',
    mode = 'normal',
    taskId,
    taskTitle
}: AddTransactionDialogProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { register, handleSubmit, control, watch, formState: { errors }, setValue, reset } = useForm();

    const [taskSearch, setTaskSearch] = useState("");

    // Use the new search hook
    const { data: tasksData, isLoading: isLoadingTasks } = useTasksSearch({
        query: taskSearch,
        enabled: isOpen && defaultType === 'Expenditure'
    });

    const { data: categories } = useQuery({ queryKey: ['paymentCategories'], queryFn: getPaymentCategories });
    const { data: methods } = useQuery({ queryKey: ['paymentMethods'], queryFn: getPaymentMethods });

    // Fetch managers for approver selection (only needed for accountants)
    const { data: managers } = useQuery({
        queryKey: ['managers'],
        queryFn: () => listManagers().then(res => res.data),
        enabled: isOpen && user?.role === 'Accountant'
    });

    // Map search results to options
    const taskOptions = [
        { label: "None", value: "null" },
        ...(tasksData?.results.map((task: any) => ({ label: task.title, value: String(task.id) })) || [])
    ];

    useEffect(() => {
        if (isOpen) {
            // Set transaction type on open
            setValue('transaction_type', defaultType);

            if (mode === 'refund' && taskId) {
                setValue('task', taskId);
                setValue('description', `Refund for task: ${taskTitle}`);
                setValue('cost_type', 'Subtractive');
                if (taskTitle) setTaskSearch(taskTitle);
            }
        } else {
            reset();
            setTaskSearch("");
        }
    }, [isOpen, defaultType, mode, taskId, taskTitle, setValue, reset]);

    const isManager = user?.role === 'Manager';
    const isAccountant = user?.role === 'Accountant';
    const isRefund = mode === 'refund';
    const transactionType = watch('transaction_type') || defaultType;
    const selectedApprover = watch('approver_id');

    // Determine if auto-approved: Manager always auto-approved, Accountant with selected approver also auto-approved
    const willAutoApprove = isManager || (isAccountant && selectedApprover);

    const mutation = useMutation({
        mutationFn: createTransactionRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactionRequests'] });
            queryClient.invalidateQueries({ queryKey: ['expenditureRequests'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            if (taskId) {
                queryClient.invalidateQueries({ queryKey: ['task', taskId] });
            }
            showTransactionRequestCreatedToast(transactionType, willAutoApprove);
            onClose();
        },
        onError: (error: any) => {
            showTransactionRequestErrorToast(transactionType, error.response?.data?.detail);
        },
    });

    const onSubmit = (data: any) => {
        const payload = {
            ...data,
            task: data.task === 'null' ? null : data.task || null,
            approver_id: data.approver_id === 'null' ? null : data.approver_id || null,
            // Only include cost_type for expenditures with tasks
            cost_type: transactionType === 'Expenditure' && data.task && data.task !== 'null'
                ? (data.cost_type || 'Inclusive')
                : null,
        };
        mutation.mutate(payload);
    };

    const selectedTask = watch('task');
    const showCostType = transactionType === 'Expenditure' && selectedTask && selectedTask !== 'null';
    const showTaskSelector = transactionType === 'Expenditure'; // Only expenditures get linked to tasks

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>
                        {isRefund ? 'Request Refund' : `Add ${transactionType}`}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    {/* Hidden transaction type field */}
                    <input type="hidden" {...register('transaction_type')} />

                    <div className="grid gap-2 md:col-span-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            {...register('description', { required: true })}
                            disabled={isRefund}
                            placeholder={transactionType === 'Revenue'
                                ? "e.g., Cash injection from owner, Sale of old parts..."
                                : "Describe the expenditure..."
                            }
                        />
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

                    {/* Task selector - only for Expenditures */}
                    {showTaskSelector && (
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
                                        disabled={isRefund}
                                    />
                                )}
                            />
                        </div>
                    )}

                    {/* Cost type - only for Expenditures with tasks */}
                    {showCostType && (
                        <div className="grid gap-2">
                            <Label htmlFor="cost_type">Cost Type</Label>
                            <Controller
                                name="cost_type"
                                control={control}
                                defaultValue="Inclusive"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isRefund}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {isRefund ? (
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

                    {/* Approver selector - only for Accountants */}
                    {isAccountant && (
                        <div className="grid gap-2 md:col-span-2">
                            <Label htmlFor="approver_id">
                                Approver (Optional)
                                <span className="text-xs text-muted-foreground ml-2">
                                    {selectedApprover ? 'Will be auto-approved' : 'Leave blank to send for manager approval'}
                                </span>
                            </Label>
                            <Controller
                                name="approver_id"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a manager (or leave blank)..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="null">None - Send for approval</SelectItem>
                                            {managers?.map((manager: any) => (
                                                <SelectItem key={manager.id} value={String(manager.id)}>
                                                    {manager.first_name} {manager.last_name} ({manager.username})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    )}

                    <DialogFooter className="md:col-span-2">
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
