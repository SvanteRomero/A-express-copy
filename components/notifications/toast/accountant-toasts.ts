/**
 * Accountant/Debts page toast notifications
 */

import { toast } from '@/hooks/use-toast';

/**
 * Show success toast after payment is added
 */
export function showPaymentAddedToast() {
    toast({
        title: 'Payment Added',
        description: 'The payment has been added successfully.',
    });
}

/**
 * Show success toast after debt reminder is sent
 */
export function showReminderSentToast(recipient?: string) {
    toast({
        title: 'Reminder Sent',
        description: `Debt reminder SMS sent to ${recipient || 'customer'}.`,
    });
}

/**
 * Show error toast when debt reminder fails
 */
export function showReminderFailedToast(errorMessage?: string) {
    toast({
        title: 'Failed to Send',
        description: errorMessage || 'Failed to send debt reminder SMS.',
        variant: 'destructive',
    });
}

/**
 * Show error toast when customer has no phone number
 */
export function showNoPhoneToast() {
    toast({
        title: 'No Phone Number',
        description: 'This customer does not have a phone number on file.',
        variant: 'destructive',
    });
}

/**
 * Show error toast when task is not found
 */
export function showTaskNotFoundToast() {
    toast({
        title: 'Error',
        description: 'Could not find task details.',
        variant: 'destructive',
    });
}

/**
 * Show success toast after marking task as paid
 */
export function showMarkedAsPaidToast() {
    toast({
        title: 'Payment Recorded',
        description: 'Task has been marked as fully paid.',
    });
}
