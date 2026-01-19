/**
 * User management toast notifications
 */

import { toast } from '@/hooks/use-toast';

/**
 * Show success toast when user is created
 */
export function showUserCreatedToast(username: string) {
    toast({
        title: 'User Created',
        description: `User "${username}" has been created successfully.`,
    });
}

/**
 * Show error toast when user creation fails
 */
export function showUserCreateErrorToast(errorMessage: string) {
    toast({
        title: 'Error Creating User',
        description: errorMessage,
        variant: 'destructive',
    });
}

/**
 * Show success toast when user is updated
 */
export function showUserUpdatedToast(username: string) {
    toast({
        title: 'User Updated',
        description: `User "${username}" has been updated successfully.`,
    });
}

/**
 * Show error toast when user update fails
 */
export function showUserUpdateErrorToast(errorMessage: string) {
    toast({
        title: 'Error Updating User',
        description: errorMessage,
        variant: 'destructive',
    });
}

/**
 * Show success toast when user is deleted
 */
export function showUserDeletedToast() {
    toast({
        title: 'User Deleted',
        description: 'User has been deleted successfully.',
    });
}

/**
 * Show error toast when user deletion fails
 */
export function showUserDeleteErrorToast(errorMessage: string) {
    toast({
        title: 'Error Deleting User',
        description: errorMessage,
        variant: 'destructive',
    });
}

/**
 * Show success toast when password is changed
 */
export function showPasswordChangedToast(username: string) {
    toast({
        title: 'Password Changed',
        description: `Password for user "${username}" has been updated.`,
    });
}

/**
 * Show error toast when password change fails
 */
export function showPasswordChangeErrorToast(errorMessage: string) {
    toast({
        title: 'Error Changing Password',
        description: errorMessage,
        variant: 'destructive',
    });
}
