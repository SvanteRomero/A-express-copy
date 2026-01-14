/**
 * Common toast helpers used across multiple pages
 */

import { toast } from '@/hooks/use-toast';
import type { SmsResult } from './types';

/**
 * Show a generic success toast
 */
export function showSuccessToast(title: string, description: string) {
    toast({
        title,
        description,
    });
}

/**
 * Show a generic error toast
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
        className: 'bg-green-600 text-white border-green-600',
    });
}

/**
 * Handle SMS result and show appropriate toast
 * @param result - The SMS result from the API
 * @param successTitle - Title when SMS was sent
 * @param noPhoneTitle - Title when no phone number
 * @param failedTitle - Title when SMS failed
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
