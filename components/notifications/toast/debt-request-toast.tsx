'use client';

/**
 * Interactive toast for debt request approval (for Managers).
 * Thin wrapper over the shared actionable toast component.
 */

import React from 'react';
import { approveDebt, rejectDebt } from '@/lib/api-client';
import { showActionableToast, dismissActionableToast } from './actionable-toast';

interface DebtRequestData {
    request_id: number;
    task_id: string;
    task_title: string;
    requester_name: string;
    requester_id: number;
}

/**
 * Show an interactive toast for debt request approval.
 */
export function showDebtRequestToast(
    data: DebtRequestData,
    onAction?: () => void
) {
    const { request_id, task_id, task_title, requester_name, requester_id } = data;

    showActionableToast({
        requestId: request_id,
        title: '💳 Debt Request',
        description: (
            <div className="flex flex-col gap-2">
                <span className="font-medium">{requester_name}</span>
                <span>requests to mark <span className="font-semibold">{task_title}</span> as debt</span>
            </div>
        ),
        onApprove: () => approveDebt(task_id, requester_id, request_id, requester_name),
        onReject: () => rejectDebt(task_id, requester_id, request_id),
        approveSuccess: {
            title: '✅ Debt Request Approved',
            description: `${task_title} has been marked as debt.`,
        },
        rejectSuccess: {
            title: '❌ Debt Request Rejected',
            description: `${task_title} will not be marked as debt.`,
        },
        onAction,
    });
}

/**
 * Dismiss a debt request toast by its request ID.
 */
export function dismissDebtRequestToast(requestId: number) {
    dismissActionableToast(requestId);
}
