/**
 * Front Desk page toast notifications.
 * Delegates SMS result handling to the shared showSmsResultToast helper.
 */

import { toast } from '@/hooks/use-toast';
import type { SmsResult } from './types';
import { showSmsResultToast } from './common-toasts';

/**
 * Show toast after task approval
 */
export function showTaskApprovedToast(result: SmsResult) {
    showSmsResultToast(
        result,
        'Task Approved',
        (phone) => `Customer notified via SMS to ${phone}`,
        'Customer notification skipped - no phone number on file',
        'Task approved but SMS notification failed'
    );
}

/**
 * Show error toast when task approval fails
 */
export function showTaskApprovalErrorToast() {
    toast({
        title: 'Error',
        description: 'Failed to approve task',
        variant: 'destructive',
    });
}

/**
 * Show toast after task pickup
 */
export function showTaskPickedUpToast(result: SmsResult, isDebt: boolean) {
    const messageType = isDebt ? 'Debt reminder' : 'Thank you message';

    showSmsResultToast(
        result,
        'Picked Up',
        (phone) => `${messageType} sent via SMS to ${phone}`,
        'Customer notification skipped - no phone number on file',
        'Task picked up but SMS notification failed'
    );
}

/**
 * Show error toast when pickup fails
 */
export function showPickupErrorToast() {
    toast({
        title: 'Error',
        description: 'Failed to mark task as picked up',
        variant: 'destructive',
    });
}

/**
 * Show warning toast when payment is required before pickup
 */
export function showPaymentRequiredToast() {
    toast({
        title: 'Payment Required',
        description: 'This task cannot be marked as picked up until it is fully paid. Please contact the manager for assistance.',
        variant: 'destructive',
    });
}
