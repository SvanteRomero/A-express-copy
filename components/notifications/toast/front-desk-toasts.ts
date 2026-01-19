/**
 * Front Desk page toast notifications
 */

import { toast } from '@/hooks/use-toast';
import type { SmsResult } from './types';

/**
 * Show toast after task approval
 */
export function showTaskApprovedToast(result: SmsResult) {
    if (result.sms_sent) {
        toast({
            title: 'Task Approved',
            description: `Customer notified via SMS to ${result.sms_phone}`,
        });
    } else if (result.sms_phone === null) {
        toast({
            title: 'Task Approved',
            description: 'Customer notification skipped - no phone number on file',
            variant: 'default',
        });
    } else {
        toast({
            title: 'Task Approved',
            description: 'Task approved but SMS notification failed',
            variant: 'destructive',
        });
    }
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

    if (result.sms_sent) {
        toast({
            title: 'Picked Up',
            description: `${messageType} sent via SMS to ${result.sms_phone}`,
        });
    } else if (result.sms_phone === null) {
        toast({
            title: 'Picked Up',
            description: 'Customer notification skipped - no phone number on file',
            variant: 'default',
        });
    } else {
        toast({
            title: 'Picked Up',
            description: 'Task picked up but SMS notification failed',
            variant: 'destructive',
        });
    }
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
