/**
 * Hook to poll for scheduler notifications and display toasts
 * Only active for managers and front_desk users
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
    getSchedulerNotifications,
    acknowledgeSchedulerNotification,
} from '@/lib/api-client';
import { showSchedulerNotificationToast } from '@/components/notifications/toast';

const POLL_INTERVAL_MS = 30000; // 30 seconds

export function useSchedulerNotifications() {
    const { user } = useAuth();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isPollingRef = useRef(false);

    const checkNotifications = useCallback(async () => {
        // Prevent concurrent polling
        if (isPollingRef.current) return;
        isPollingRef.current = true;

        try {
            const notifications = await getSchedulerNotifications();

            for (const notification of notifications) {
                // Show appropriate toast
                showSchedulerNotificationToast(notification);

                // Acknowledge so we don't show again
                await acknowledgeSchedulerNotification(notification.id);
            }
        } catch (error) {
            // Silently fail - don't spam console for polling errors
            console.debug('Scheduler notification poll failed:', error);
        } finally {
            isPollingRef.current = false;
        }
    }, []);

    useEffect(() => {
        // Only poll for managers and front_desk
        const allowedRoles = ['manager', 'front_desk'];
        if (!user || !allowedRoles.includes(user.role)) {
            return;
        }

        // Check immediately on mount
        checkNotifications();

        // Then poll every 30 seconds
        intervalRef.current = setInterval(checkNotifications, POLL_INTERVAL_MS);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [user, checkNotifications]);
}
