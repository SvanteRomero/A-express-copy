'use client';

/**
 * Shared actionable toast component — provides approve/reject toast pattern.
 * Used by request-toast.tsx and debt-request-toast.tsx to eliminate structural duplication (SRP).
 */

import React from 'react';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/feedback/toast';

// Store for dismiss functions by request ID (enables global dismissal)
const dismissFunctions = new Map<number, () => void>();

export interface ActionableToastConfig {
    /** Unique ID for deduplication and dismissal */
    requestId: number;
    /** Toast title (e.g. '💳 Debt Request') */
    title: string;
    /** JSX element for the toast body */
    description: React.ReactNode;
    /** API call to execute on approve */
    onApprove: () => Promise<any>;
    /** API call to execute on reject */
    onReject: () => Promise<any>;
    /** Toast content shown after successful approval */
    approveSuccess: { title: string; description: string };
    /** Toast content shown after successful rejection */
    rejectSuccess: { title: string; description: string };
    /** Optional callback after any action (e.g. query invalidation) */
    onAction?: () => void;
}

/**
 * Show an interactive toast with Approve/Reject buttons.
 * Handles deduplication, dismiss management, and error handling.
 */
export function showActionableToast(config: ActionableToastConfig) {
    const { requestId, title, description, onApprove, onReject, approveSuccess, rejectSuccess, onAction } = config;

    // Prevent duplicate toasts for the same request
    if (dismissFunctions.has(requestId)) {
        return;
    }

    const handleApprove = async () => {
        try {
            await onApprove();
            const dismiss = dismissFunctions.get(requestId);
            if (dismiss) dismiss();
            dismissFunctions.delete(requestId);

            toast({
                title: approveSuccess.title,
                description: approveSuccess.description,
                variant: 'success',
            });

            if (onAction) onAction();
        } catch {
            toast({
                title: '❌ Error',
                description: 'Failed to approve request. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleReject = async () => {
        try {
            await onReject();
            const dismiss = dismissFunctions.get(requestId);
            if (dismiss) dismiss();
            dismissFunctions.delete(requestId);

            toast({
                title: rejectSuccess.title,
                description: rejectSuccess.description,
            });

            if (onAction) onAction();
        } catch {
            toast({
                title: '❌ Error',
                description: 'Failed to reject request. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const { dismiss } = toast({
        title,
        description,
        duration: 15000,
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

    dismissFunctions.set(requestId, dismiss);
}

/**
 * Dismiss an actionable toast by its request ID.
 * Called when another manager resolves the request via WebSocket broadcast.
 */
export function dismissActionableToast(requestId: number) {
    const dismiss = dismissFunctions.get(requestId);
    if (dismiss) {
        dismiss();
        dismissFunctions.delete(requestId);
    }
}
