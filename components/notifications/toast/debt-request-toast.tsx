'use client';

/**
 * Interactive toast for debt request approval (for Managers).
 * Shows approve/reject buttons and stays until dismissed.
 */

import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/feedback/toast';
import { approveDebt, rejectDebt } from '@/lib/api-client';

interface DebtRequestData {
    request_id: string;
    task_id: string;
    task_title: string;
    requester_name: string;
    requester_id: number;
}

// Store for dismiss functions by request ID (enables global dismissal)
const dismissFunctions = new Map<string, () => void>();

/**
 * Show an interactive toast for debt request approval.
 * Toast stays until user takes action or another manager resolves it.
 */
export function showDebtRequestToast(
    data: DebtRequestData,
    onAction?: () => void
) {
    const { request_id, task_id, task_title, requester_name, requester_id } = data;

    // Prevent duplicate toasts for the same request
    if (dismissFunctions.has(request_id)) {
        return;
    }

    const handleApprove = async () => {
        try {
            await approveDebt(task_id, requester_id, request_id, requester_name);
            // Dismiss handled by WebSocket broadcast

            toast({
                title: '✅ Debt Request Approved',
                description: `${task_title} has been marked as debt.`,
                className: 'bg-green-600 text-white border-green-600',
            });

            if (onAction) onAction();
        } catch (error) {
            toast({
                title: '❌ Error',
                description: 'Failed to approve debt request. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleReject = async () => {
        try {
            await rejectDebt(task_id, requester_id, request_id);
            // Dismiss handled by WebSocket broadcast

            toast({
                title: '❌ Debt Request Rejected',
                description: `${task_title} will not be marked as debt.`,
            });

            if (onAction) onAction();
        } catch (error) {
            toast({
                title: '❌ Error',
                description: 'Failed to reject debt request. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const { dismiss } = toast({
        title: '💳 Debt Request',
        description: (
            <div className="flex flex-col gap-2">
                <span className="font-medium">{requester_name}</span>
                <span>requests to mark <span className="font-semibold">{task_title}</span> as debt</span>
            </div>
        ),
        duration: Infinity, // Stay until dismissed
        action: (
            <div className="flex flex-col gap-1">
                <ToastAction
                    altText="Approve"
                    onClick={handleApprove}
                    className="bg-green-600 hover:bg-green-700 text-white border-0"
                >
                    Approve
                </ToastAction>
                <ToastAction
                    altText="Reject"
                    onClick={handleReject}
                    className="bg-red-600 hover:bg-red-700 text-white border-0"
                >
                    Reject
                </ToastAction>
            </div>
        ),
    });

    // Store dismiss function for global dismissal
    dismissFunctions.set(request_id, dismiss);
}

/**
 * Dismiss a debt request toast by its request ID.
 * Called when another manager resolves the request.
 */
export function dismissDebtRequestToast(requestId: string) {
    const dismiss = dismissFunctions.get(requestId);
    if (dismiss) {
        dismiss();
        dismissFunctions.delete(requestId);
    }
}
