/**
 * Toast Registry — maps toast type strings to handler functions.
 * Allows domain modules to self-register their handlers (OCP),
 * so new toast types can be added without modifying the dispatcher.
 */

import { toast } from '@/hooks/use-toast';

export type ToastHandler = (data: Record<string, any>) => void;

const registry = new Map<string, ToastHandler>();

/**
 * Register a toast handler for a given type.
 * Called at module-load time by domain toast modules.
 */
export function registerToastHandler(type: string, handler: ToastHandler) {
    if (registry.has(type)) {
        console.warn(`[ToastRegistry] Overwriting handler for type: ${type}`);
    }
    registry.set(type, handler);
}

/**
 * Dispatch a toast by its registered type.
 * Returns true if a handler was found and called, false otherwise.
 */
export function dispatchRegisteredToast(type: string, data: Record<string, any>): boolean {
    const handler = registry.get(type);
    if (handler) {
        handler(data);
        return true;
    }
    return false;
}

/**
 * Check if a handler is registered for the given type.
 */
export function hasToastHandler(type: string): boolean {
    return registry.has(type);
}

// ── Self-register all WebSocket toast handlers ──
// Each handler maps a backend toast_type to a toast() call.

registerToastHandler('task_created', (data) => {
    toast({
        title: '📋 New Task Created',
        description: `Task ${data.task_title} for ${data.customer_name}`,
        variant: 'info',
        toastType: 'task_created',
    });
});

registerToastHandler('task_approved', (data) => {
    let description = `${data.task_title} is ready for pickup`;
    if (data.sms_sent && data.sms_phone) {
        description += ` • SMS sent to ${data.sms_phone}`;
    } else if (data.sms_sent === false && data.sms_phone === null) {
        description += ' • No phone on file';
    }
    toast({
        title: '✅ Task Approved',
        description,
        variant: 'success',
        toastType: 'task_approved',
    });
});

registerToastHandler('task_picked_up', (data) => {
    const messageType = data.is_debt ? 'Debt reminder' : 'Thank you message';
    let description = `${data.task_title} has been collected`;
    if (data.sms_sent && data.sms_phone) {
        description += ` • ${messageType} sent to ${data.sms_phone}`;
    } else if (data.sms_sent === false && data.sms_phone === null) {
        description += ' • No phone on file';
    }
    toast({
        title: '📦 Task Picked Up',
        description,
        toastType: 'task_picked_up',
    });
});

registerToastHandler('payment_added', (data) => {
    toast({
        title: '💰 Payment Added',
        description: `TSH ${data.amount} added to ${data.task_title}`,
        variant: 'success',
        toastType: 'payment_added',
    });
});

registerToastHandler('task_updated', (data) => {
    const fieldsInfo = data.fields_changed && data.fields_changed.length > 0
        ? ` (${data.fields_changed.join(', ')})`
        : '';
    toast({
        title: '🔄 Task Updated',
        description: `${data.task_title} was modified${fieldsInfo}`,
        toastType: 'task_updated',
    });
});

registerToastHandler('task_completed', (data) => {
    toast({
        title: '🛠️ Task Completed',
        description: `${data.task_title} completed by ${data.technician_name}`,
        variant: 'purple',
        toastType: 'task_completed',
    });
});

registerToastHandler('task_sent_to_workshop', (data) => {
    toast({
        title: '🔧 New Workshop Task',
        description: `${data.task_title} sent to workshop by ${data.sender_name}`,
        variant: 'indigo',
        toastType: 'task_sent_to_workshop',
    });
});

registerToastHandler('workshop_task_solved', (data) => {
    toast({
        title: '✅ Workshop Task Solved',
        description: `${data.task_title} solved by workshop`,
        variant: 'success',
        toastType: 'workshop_task_solved',
    });
});

registerToastHandler('workshop_task_not_solved', (data) => {
    toast({
        title: '⚠️ Workshop Task Not Solved',
        description: `${data.task_title} returned by workshop`,
        variant: 'warning',
        toastType: 'workshop_task_not_solved',
    });
});

registerToastHandler('task_assigned', (data) => {
    toast({
        title: '📌 New Task Assignment',
        description: `${data.task_title} assigned to you by ${data.assigner_name}`,
        variant: 'info',
        toastType: 'task_assigned',
    });
});

registerToastHandler('payment_method_created', (data) => {
    toast({
        title: '💳 Payment Method Created',
        description: `${data.payment_method_name} created by ${data.user_name}`,
        variant: 'success',
        toastType: 'payment_method_created',
    });
});

registerToastHandler('payment_method_updated', (data) => {
    toast({
        title: '💳 Payment Method Updated',
        description: `${data.payment_method_name} updated by ${data.user_name}`,
        toastType: 'payment_method_updated',
    });
});

registerToastHandler('payment_method_deleted', (data) => {
    toast({
        title: '🗑️ Payment Method Deleted',
        description: `${data.payment_method_name} deleted by ${data.user_name}`,
        variant: 'destructive',
        toastType: 'payment_method_deleted',
    });
});

registerToastHandler('debt_request_approved', (data) => {
    toast({
        title: '✅ Debt Request Approved',
        description: `${data.task_title} marked as debt by ${data.approver_name}`,
        variant: 'success',
        toastType: 'debt_request_approved',
    });
});

registerToastHandler('debt_request_rejected', (data) => {
    toast({
        title: '❌ Debt Request Rejected',
        description: `${data.task_title} was not marked as debt`,
        variant: 'destructive',
        toastType: 'debt_request_rejected',
    });
});

registerToastHandler('task_terminated', (data) => {
    toast({
        title: '⚠️ Task Terminated',
        description: `${data.task_title} ready for pickup (terminated by ${data.user_name})`,
        variant: 'warning',
        toastType: 'task_terminated',
    });
});

registerToastHandler('workshop_outcome_to_verify', (data) => {
    toast({
        title: '🔍 Verification Required',
        description: `${data.task_title} marked "${data.workshop_status}" by workshop - please verify`,
        variant: 'warning',
        toastType: 'workshop_outcome_to_verify',
    });
});

registerToastHandler('workshop_outcome_disputed', (data) => {
    toast({
        title: '↩️ Workshop Do-Over Required',
        description: `${data.task_title} disputed by ${data.disputer_name} - was "${data.previous_status}"`,
        variant: 'destructive',
        toastType: 'workshop_outcome_disputed',
    });
});

registerToastHandler('workshop_outcome_confirmed', (data) => {
    toast({
        title: '✅ Verification Confirmed',
        description: `${data.task_title} "${data.workshop_status}" confirmed by ${data.confirmer_name}`,
        variant: 'success',
        toastType: 'workshop_outcome_confirmed',
    });
});

registerToastHandler('transaction_request_approved', (data) => {
    toast({
        title: '✅ Transaction Request Approved',
        description: `Your request was approved by ${data.approver_name}`,
        variant: 'success',
        toastType: 'transaction_request_approved',
    });
});

registerToastHandler('transaction_request_rejected', (data) => {
    toast({
        title: '❌ Transaction Request Rejected',
        description: `Your request was rejected by ${data.approver_name}`,
        variant: 'destructive',
        toastType: 'transaction_request_rejected',
    });
});
