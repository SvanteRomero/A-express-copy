'use client';

/**
 * Interactive toast for transaction request approval (unified for Expenditure and Revenue).
 * Thin wrapper over the shared actionable toast component.
 */

import { approveTransactionRequest, rejectTransactionRequest } from '@/lib/api-client';
import { showActionableToast, dismissActionableToast } from './actionable-toast';

interface TransactionRequestData {
    request_id: number;
    transaction_type: 'Expenditure' | 'Revenue';
    description: string;
    amount: string;
    requester_name: string;
}

/**
 * Show an interactive toast for transaction request approval.
 */
export function showTransactionRequestToast(
    data: TransactionRequestData,
    onAction?: () => void
) {
    const { request_id, transaction_type, description, amount, requester_name } = data;
    const icon = transaction_type === 'Revenue' ? '💵' : '💰';
    const colorClass = transaction_type === 'Revenue' ? 'text-green-600' : 'text-amber-600';

    const shortDescription = description.length > 50
        ? `${description.substring(0, 50)}...`
        : description;

    showActionableToast({
        requestId: request_id,
        title: `${icon} ${transaction_type} Request`,
        description: (
            <div className="flex flex-col gap-2">
                <span className="font-medium">{requester_name}</span>
                <span>{shortDescription}</span>
                <span className={`font-bold ${colorClass}`}>TSH {Number(amount).toLocaleString()}</span>
            </div>
        ),
        onApprove: () => approveTransactionRequest(request_id),
        onReject: () => rejectTransactionRequest(request_id),
        approveSuccess: {
            title: '✅ Request Approved',
            description: `${transaction_type} for TSH ${Number(amount).toLocaleString()} has been approved.`,
        },
        rejectSuccess: {
            title: '❌ Request Rejected',
            description: `${transaction_type} request has been rejected.`,
        },
        onAction,
    });
}

/**
 * Dismiss a transaction request toast by its request ID.
 */
export function dismissTransactionRequestToast(requestId: number) {
    dismissActionableToast(requestId);
}
