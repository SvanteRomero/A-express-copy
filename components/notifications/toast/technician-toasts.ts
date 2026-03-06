/**
 * Technician page toast notifications.
 * Uses semantic variants instead of hardcoded className strings.
 */

import { toast } from '@/hooks/use-toast';

/**
 * Show success toast when task is sent to workshop
 */
export function showSentToWorkshopToast() {
    toast({
        title: '🔧 Sent to Workshop',
        description: 'Task sent to workshop successfully.',
        variant: 'indigo',
    });
}

/**
 * Show error toast when workshop selection is incomplete
 */
export function showWorkshopSelectionErrorToast() {
    toast({
        title: 'Selection Required',
        description: 'Please select a workshop location and technician.',
        variant: 'destructive',
    });
}

/**
 * Show success toast when workshop status is updated
 */
export function showWorkshopStatusChangedToast(status: string) {
    toast({
        title: '✅ Status Updated',
        description: `Task marked as ${status}.`,
    });
}
