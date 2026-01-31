'use client';

/**
 * Interactive toast for transaction request approval (unified for Expenditure and Revenue).
 * Shows approve/reject buttons and stays until dismissed.
 */

import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/feedback/toast';
import { approveTransactionRequest, rejectTransactionRequest } from '@/lib/api-client';

interface TransactionRequestData {
    request_id: number;
    transaction_type: 'Expenditure' | 'Revenue';
    description: string;
    amount: string;
    requester_name: string;
}

// Store for dismiss functions by request ID
const dismissFunctions = new Map<number, () => void>();

/**
 * Show an interactive toast for transaction request approval.
 * Toast stays until user takes action or dismisses manually.
 */
export function showTransactionRequestToast(
    data: TransactionRequestData,
    onAction?: () => void
) {
    const { request_id, transaction_type, description, amount, requester_name } = data;

    // Prevent duplicate toasts for the same request
    if (dismissFunctions.has(request_id)) {
        return;
    }

    // Determine icon based on type
    const icon = transaction_type === 'Revenue' ? '💵' : '💰';
    const colorClass = transaction_type === 'Revenue'
        ? 'text-green-600'
        : 'text-amber-600';

    // Truncate description if too long
    const shortDescription = description.length > 50
        ? `${description.substring(0, 50)}...`
        : description;

    const handleApprove = async () => {
        try {
            await approveTransactionRequest(request_id);
            // Dismiss this toast
            const dismiss = dismissFunctions.get(request_id);
            if (dismiss) dismiss();
            dismissFunctions.delete(request_id);

            // Show success toast
            toast({
                title: '✅ Request Approved',
                description: `${transaction_type} for TSH ${Number(amount).toLocaleString()} has been approved.`,
                className: 'bg-green-600 text-white border-green-600',
            });

            if (onAction) onAction();
        } catch (error) {
            toast({
                title: '❌ Error',
                description: 'Failed to approve request. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleReject = async () => {
        try {
            await rejectTransactionRequest(request_id);
            // Dismiss this toast
            const dismiss = dismissFunctions.get(request_id);
            if (dismiss) dismiss();
            dismissFunctions.delete(request_id);

            // Show success toast
            toast({
                title: '❌ Request Rejected',
                description: `${transaction_type} request has been rejected.`,
            });

            if (onAction) onAction();
        } catch (error) {
            toast({
                title: '❌ Error',
                description: 'Failed to reject request. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const { dismiss } = toast({
        title: `${icon} ${transaction_type} Request`,
        description: (
            <div className="flex flex-col gap-2">
                <span className="font-medium">{requester_name}</span>
                <span>{shortDescription}</span>
                <span className={`font-bold ${colorClass}`}>TSH {Number(amount).toLocaleString()}</span>
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

    // Store dismiss function for later use
    dismissFunctions.set(request_id, dismiss);
}

/**
 * Dismiss a transaction request toast by its request ID.
 * Called when another manager resolves the request.
 */
export function dismissTransactionRequestToast(requestId: number) {
    const dismiss = dismissFunctions.get(requestId);
    if (dismiss) {
        dismiss();
        dismissFunctions.delete(requestId);
    }
}
