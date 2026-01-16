'use client';

/**
 * Interactive toast for expenditure request approval.
 * Shows approve/reject buttons and stays until dismissed.
 */

import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/feedback/toast';
import { approveExpenditureRequest, rejectExpenditureRequest } from '@/lib/api-client';;

interface ExpenditureRequestData {
    request_id: number;
    description: string;
    amount: string;
    requester_name: string;
}

// Store for dismiss functions by request ID
const dismissFunctions = new Map<number, () => void>();

/**
 * Show an interactive toast for expenditure request approval.
 * Toast stays until user takes action or dismisses manually.
 */
export function showExpenditureRequestToast(
    data: ExpenditureRequestData,
    onAction?: () => void
) {
    const { request_id, description, amount, requester_name } = data;

    // Truncate description if too long
    const shortDescription = description.length > 50
        ? `${description.substring(0, 50)}...`
        : description;

    const handleApprove = async () => {
        try {
            await approveExpenditureRequest(request_id);
            // Dismiss this toast
            const dismiss = dismissFunctions.get(request_id);
            if (dismiss) dismiss();
            dismissFunctions.delete(request_id);

            // Show success toast
            toast({
                title: '✅ Request Approved',
                description: `Expenditure for TSH ${amount} has been approved.`,
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
            await rejectExpenditureRequest(request_id);
            // Dismiss this toast
            const dismiss = dismissFunctions.get(request_id);
            if (dismiss) dismiss();
            dismissFunctions.delete(request_id);

            // Show success toast
            toast({
                title: '❌ Request Rejected',
                description: `Expenditure request has been rejected.`,
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
        title: '💰 Expenditure Request',
        description: (
            <div className="flex flex-col gap-2">
                <span className="font-medium">{requester_name}</span>
                <span>{shortDescription}</span>
                <span className="font-bold">TSH {Number(amount).toLocaleString()}</span>
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
