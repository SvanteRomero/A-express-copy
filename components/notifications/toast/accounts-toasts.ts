/**
 * Account management toast notifications
 */

import { toast } from '@/hooks/use-toast';

/**
 * Show success toast when account is created
 */
export function showAccountCreatedToast() {
    toast({
        title: 'Success',
        description: 'Account created successfully.',
    });
}

/**
 * Show error toast when account creation fails
 */
export function showAccountCreateErrorToast(errorMessage: string) {
    toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
    });
}

/**
 * Show success toast when account is updated
 */
export function showAccountUpdatedToast() {
    toast({
        title: 'Success',
        description: 'Account updated successfully.',
    });
}

/**
 * Show error toast when account update fails
 */
export function showAccountUpdateErrorToast(errorMessage: string) {
    toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
    });
}

/**
 * Show success toast when account is deleted
 */
export function showAccountDeletedToast() {
    toast({
        title: 'Success',
        description: 'Account deleted successfully.',
    });
}

/**
 * Show error toast when account deletion fails
 */
export function showAccountDeleteErrorToast() {
    toast({
        title: 'Error',
        description: 'Failed to delete account.',
        variant: 'destructive',
    });
}
