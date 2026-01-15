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
    const { toast_type, data } = message;

    switch (toast_type) {
        case 'task_created':
            toast({
                title: '📋 New Task Created',
                description: `Task ${data.task_title} for ${data.customer_name}`,
                className: 'bg-blue-600 text-white border-blue-600',
            });
            break;

        case 'task_approved':
            toast({
                title: '✅ Task Approved',
                description: `${data.task_title} is ready for pickup${data.sms_sent ? ' (SMS sent)' : ''}`,
                className: 'bg-green-600 text-white border-green-600',
            });
            break;

        case 'task_picked_up':
            toast({
                title: '📦 Task Picked Up',
                description: `${data.task_title} has been collected`,
            });
            break;

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

        default:
            // Unknown toast type - log for debugging
            console.warn('Unknown WebSocket toast type:', toast_type);
    }
}
