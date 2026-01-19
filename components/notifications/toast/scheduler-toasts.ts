/**
 * Scheduler toast notifications for automated reminder jobs
 * Shows toast notifications when pickup/debt reminder jobs complete
 */

import { toast } from '@/hooks/use-toast';
import type { SchedulerNotification } from '@/lib/api-client';

/**
 * Show success toast when scheduler job completes with no failures
 */
export function showSchedulerSuccessToast(notification: SchedulerNotification) {
    const jobName = notification.job_type === 'debt_reminder'
        ? 'Debt Reminders'
        : 'Pickup Reminders';

    toast({
        title: `✅ ${jobName} Complete`,
        description: `Found ${notification.tasks_found} tasks. Sent ${notification.messages_sent} reminders.`,
        className: 'bg-green-600 text-white border-green-600',
    });
}

/**
 * Show warning toast when scheduler job completes with some failures
 */
export function showSchedulerPartialFailureToast(notification: SchedulerNotification) {
    const jobName = notification.job_type === 'debt_reminder'
        ? 'Debt Reminders'
        : 'Pickup Reminders';

    // Show first 3 failure details
    const failureList = notification.failure_details
        .slice(0, 3)
        .map(f => `• ${f.task_title}: ${f.error}`)
        .join('\n');

    const moreText = notification.failure_details.length > 3
        ? `\n...and ${notification.failure_details.length - 3} more`
        : '';

    toast({
        title: `⚠️ ${jobName} Partial Failure`,
        description: `Sent ${notification.messages_sent}/${notification.tasks_found}. Failed: ${notification.messages_failed}\n${failureList}${moreText}`,
        variant: 'destructive',
        duration: 10000, // Show longer for failures
    });
}

/**
 * Show info toast when scheduler job runs but finds no tasks
 */
export function showSchedulerNoTasksToast(notification: SchedulerNotification) {
    const jobName = notification.job_type === 'debt_reminder'
        ? 'Debt Reminders'
        : 'Pickup Reminders';

    toast({
        title: `ℹ️ ${jobName}`,
        description: 'No tasks found requiring reminders.',
    });
}

/**
 * Display appropriate toast based on notification data
 */
export function showSchedulerNotificationToast(notification: SchedulerNotification) {
    if (notification.tasks_found === 0) {
        showSchedulerNoTasksToast(notification);
    } else if (notification.messages_failed > 0) {
        showSchedulerPartialFailureToast(notification);
    } else if (notification.messages_sent > 0) {
        showSchedulerSuccessToast(notification);
    }
    // Skip if nothing happened (tasks_found > 0 but nothing sent or failed - shouldn't happen)
}
