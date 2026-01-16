/**
 * WebSocket toast dispatcher - maps server-sent toast messages to toast functions.
 * This module bridges WebSocket notifications with the centralized toast system.
 */

import { toast } from '@/hooks/use-toast';
import type { ToastNotificationMessage } from '@/lib/websocket';

/**
 * Dispatch a toast notification based on WebSocket message type.
 * Called by the WebSocketProvider when a toast_notification message is received.
 */
export function dispatchWebSocketToast(message: ToastNotificationMessage) {
    const { toast_type, data, id } = message;

    // Robust deduplication using unique message ID from server
    if ((window as any).__processedToastIds?.has(id)) {
        console.warn(`[WebSocketToast] Duplicate skipped by ID: ${id}`);
        return;
    }

    // Initialize storage if needed
    if (!(window as any).__processedToastIds) {
        (window as any).__processedToastIds = new Set();
    }

    // Add to processed set and limit size
    (window as any).__processedToastIds.add(id);
    if ((window as any).__processedToastIds.size > 100) {
        const iterator = (window as any).__processedToastIds.values();
        (window as any).__processedToastIds.delete(iterator.next().value);
    }

    switch (toast_type) {
        case 'task_created':
            toast({
                title: '📋 New Task Created',
                description: `Task ${data.task_title} for ${data.customer_name}`,
                className: 'bg-blue-600 text-white border-blue-600',
            });
            break;

        case 'task_approved': {
            let description = `${data.task_title} is ready for pickup`;
            if (data.sms_sent && data.sms_phone) {
                description += ` • SMS sent to ${data.sms_phone}`;
            } else if (data.sms_sent === false && data.sms_phone === null) {
                description += ' • No phone on file';
            }
            toast({
                title: '✅ Task Approved',
                description,
                className: 'bg-green-600 text-white border-green-600',
            });
            break;
        }

        case 'task_picked_up': {
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
            });
            break;
        }

        case 'payment_added':
            toast({
                title: '💰 Payment Added',
                description: `TSH ${data.amount} added to ${data.task_title}`,
                className: 'bg-green-600 text-white border-green-600',
            });
            break;

        case 'task_updated':
            const fieldsInfo = data.fields_changed && data.fields_changed.length > 0
                ? ` (${data.fields_changed.join(', ')})`
                : '';
            toast({
                title: '🔄 Task Updated',
                description: `${data.task_title} was modified${fieldsInfo}`,
            });
            break;

        case 'task_completed':
            toast({
                title: '🛠️ Task Completed',
                description: `${data.task_title} completed by ${data.technician_name}`,
                className: 'bg-purple-600 text-white border-purple-600',
            });
            break;

        case 'task_sent_to_workshop':
            toast({
                title: '🔧 New Workshop Task',
                description: `${data.task_title} assigned to you by ${data.sender_name}`,
                className: 'bg-indigo-600 text-white border-indigo-600',
            });
            break;

        case 'workshop_task_solved':
            toast({
                title: '✅ Workshop Task Solved',
                description: `${data.task_title} solved by ${data.workshop_technician_name}`,
                className: 'bg-green-600 text-white border-green-600',
            });
            break;

        case 'workshop_task_not_solved':
            toast({
                title: '⚠️ Workshop Task Not Solved',
                description: `${data.task_title} returned by ${data.workshop_technician_name}`,
                className: 'bg-orange-600 text-white border-orange-600',
            });
            break;

        case 'task_assigned':
            toast({
                title: '📌 New Task Assignment',
                description: `${data.task_title} assigned to you by ${data.assigner_name}`,
                className: 'bg-blue-600 text-white border-blue-600',
            });
            break;

        default:
            // Unknown toast type - log for debugging
            console.warn('Unknown WebSocket toast type:', toast_type);
    }
}

