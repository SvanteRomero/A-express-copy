/**
 * WebSocket toast dispatcher — bridges WebSocket notifications with the toast system.
 * Uses the toast registry for handler lookup (OCP-compliant).
 * Handles deduplication and notification preference checking.
 */

import type { ToastNotificationMessage } from '@/lib/websocket';
import { isToastEnabled } from '@/components/provider/notification-preferences';
import { dispatchRegisteredToast } from './toast-registry';

// Module-level deduplication set
const processedToastIds = new Set<string>();
const MAX_PROCESSED_IDS = 100;

/**
 * Dispatch a toast notification based on WebSocket message type.
 * Called by the WebSocketProvider when a toast_notification message is received.
 * Checks deduplication and user notification preferences before dispatching.
 */
export function dispatchWebSocketToast(message: ToastNotificationMessage) {
    const { toast_type, data, id } = message;

    // Robust deduplication using unique message ID from server
    if (processedToastIds.has(id)) {
        console.warn(`[WebSocketToast] Duplicate skipped by ID: ${id}`);
        return;
    }

    // Add to processed set and limit size
    processedToastIds.add(id);
    if (processedToastIds.size > MAX_PROCESSED_IDS) {
        const oldest = processedToastIds.values().next().value;
        if (oldest) processedToastIds.delete(oldest);
    }

    // Check if user has disabled this notification category
    if (!isToastEnabled(toast_type)) {
        return;
    }

    // Dispatch via registry — no switch statement needed
    const handled = dispatchRegisteredToast(toast_type, data);
    if (!handled) {
        console.warn('Unknown WebSocket toast type:', toast_type);
    }
}
