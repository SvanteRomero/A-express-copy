/**
 * Task-related toast notifications
 */

import { toast } from '@/hooks/use-toast';
import type { SmsResult } from './types';

/**
 * Show success toast after task creation
 */
export function showTaskCreatedToast() {
    toast({
        title: 'Task Created!',
        description: 'The new task has been added to the system.',
        className: 'bg-green-600 text-white border-green-600',
    });
}

/**
 * Show toast when customer is created along with task
 */
export function showCustomerCreatedToast(customerName: string) {
    toast({
        title: 'Customer Created',
        description: `Customer ${customerName} has been added to the database.`,
    });
}

/**
 * Show toast after task creation with SMS result
 */
export function showTaskCreatedWithSmsToast(smsPhone: string) {
    toast({
        title: 'Customer Notified',
        description: `Registration SMS sent to ${smsPhone}`,
        className: 'bg-blue-600 text-white border-blue-600',
    });
}

/**
 * Show error toast when task creation fails
 */
export function showTaskCreationErrorToast(error: string) {
    toast({
        title: 'Error Creating Task',
        description: error,
        variant: 'destructive',
    });
}

/**
 * Show success toast when task is marked as debt
 */
export function showTaskMarkedAsDebtToast(taskTitle: string) {
    toast({
        title: 'Task Marked as Debt',
        description: `Task ${taskTitle} has been marked as debt.`,
    });
}

/**
 * Show error toast when marking task as debt fails
 */
export function showMarkAsDebtErrorToast(errorMessage: string) {
    toast({
        title: 'Error',
        description: errorMessage || 'Failed to mark task as debt.',
        variant: 'destructive',
    });
}

/**
 * Show success toast when repair management is saved
 * @param changedFields - Optional array of field names that were changed
 */
export function showRepairManagementSavedToast(changedFields?: string[]) {
    const description = changedFields && changedFields.length > 0
        ? `Updated: ${changedFields.join(', ')}`
        : 'Repair management details have been updated.';

    toast({
        title: '✅ Changes Saved',
        description,
    });
}

/**
 * Show success toast when financials are saved
 */
export function showFinancialsSavedToast() {
    toast({
        title: 'Financials Saved',
        description: 'Pricing details have been updated.',
    });
}

/**
 * Show toast after customer notification is sent
 */
export function showCustomerNotificationToast(result: SmsResult) {
    if (result.sms_sent) {
        toast({
            title: 'Message Sent',
            description: `SMS sent successfully to ${result.sms_phone}`,
        });
    } else if (result.sms_phone === null) {
        toast({
            title: 'Cannot Send',
            description: 'Customer does not have a phone number on file',
            variant: 'destructive',
        });
    } else {
        toast({
            title: 'Error',
            description: 'Failed to send SMS notification',
            variant: 'destructive',
        });
    }
}

/**
 * Show toast when phone number is copied
 */
export function showPhoneCopiedToast() {
    toast({
        title: 'Copied',
        description: 'Phone number copied to clipboard',
    });
}

/**
 * Show error toast when copying phone fails
 */
export function showPhoneCopyErrorToast() {
    toast({
        title: 'Error',
        description: 'Failed to copy phone number',
        variant: 'destructive',
    });
}

/**
 * Show success toast when customer update SMS is sent
 */
export function showCustomerUpdateSentToast(phoneNumber: string) {
    toast({
        title: '📱 Message Sent!',
        description: `Customer update sent to ${phoneNumber}`,
        className: 'bg-green-600 text-white border-green-600',
    });
}

/**
 * Show error toast when customer update SMS fails
 */
export function showCustomerUpdateFailedToast(errorMessage?: string) {
    toast({
        title: 'Failed to Send',
        description: errorMessage || 'Failed to send SMS',
        variant: 'destructive',
    });
}

/**
 * Show error toast when message is required
 */
export function showMessageRequiredToast() {
    toast({
        title: 'Message Required',
        description: 'Please enter a message to send.',
        variant: 'destructive',
    });
}

/**
 * Show error toast when phone number is required
 */
export function showPhoneRequiredToast() {
    toast({
        title: 'Phone Number Required',
        description: 'Please select a phone number to send the message to.',
        variant: 'destructive',
    });
}

/**
 * Show error toast when template preview fails
 */
export function showPreviewFailedToast(errorMessage?: string) {
    toast({
        title: 'Preview Failed',
        description: errorMessage || 'Could not generate message preview',
        variant: 'destructive',
    });
}
