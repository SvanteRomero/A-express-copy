/**
 * Common toast helpers used across multiple pages.
 * Provides generic success/error helpers and a CRUD factory to reduce boilerplate.
 */

import { toast } from '@/hooks/use-toast';
import type { SmsResult } from './types';

// ── Generic helpers ──

/**
 * Show a generic success toast (default styling)
 */
export function showSuccessToast(title: string, description: string) {
    toast({
        title,
        description,
    });
}

/**
 * Show a generic error toast (destructive styling)
 */
export function showErrorToast(title: string, description: string) {
    toast({
        title,
        description,
        variant: 'destructive',
    });
}

/**
 * Show a success toast with green styling
 */
export function showGreenSuccessToast(title: string, description: string) {
    toast({
        title,
        description,
        variant: 'success',
    });
}

// ── SMS result helper ──

/**
 * Handle SMS result and show appropriate toast.
 * Reusable across front-desk, tasks, and any other SMS-related operations.
 */
export function showSmsResultToast(
    result: SmsResult,
    successTitle: string,
    successDescription: (phone: string) => string,
    noPhoneDescription: string,
    failedDescription: string
) {
    if (result.sms_sent) {
        toast({
            title: successTitle,
            description: successDescription(result.sms_phone || ''),
        });
    } else if (result.sms_phone === null) {
        toast({
            title: successTitle,
            description: noPhoneDescription,
            variant: 'default',
        });
    } else {
        toast({
            title: successTitle,
            description: failedDescription,
            variant: 'destructive',
        });
    }
}

// ── CRUD toast factory ──

/**
 * Show a success toast for a CRUD operation.
 * @param entity - Entity display name (e.g. 'Account', 'User', 'Payment method')
 * @param action - The action that was performed
 * @param entityName - Optional specific entity name for the description
 */
export function showCrudToast(
    entity: string,
    action: 'created' | 'updated' | 'deleted' | 'saved',
    entityName?: string
) {
    const description = entityName
        ? `${entity} "${entityName}" has been ${action} successfully.`
        : `${entity} ${action} successfully.`;

    toast({
        title: 'Success',
        description,
    });
}

/**
 * Show an error toast for a failed CRUD operation.
 * @param entity - Entity display name (e.g. 'account', 'user')
 * @param action - The action that failed
 * @param errorMessage - Optional custom error message
 */
export function showCrudErrorToast(
    entity: string,
    action: 'create' | 'update' | 'delete' | 'save' | 'load',
    errorMessage?: string
) {
    toast({
        title: 'Error',
        description: errorMessage || `Failed to ${action} ${entity}.`,
        variant: 'destructive',
    });
}
