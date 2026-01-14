/**
 * Settings page toast notifications
 */

import { toast } from '@/hooks/use-toast';

/**
 * Show success toast when settings are saved
 */
export function showSettingsSavedToast() {
    toast({
        title: 'Settings Saved',
        description: 'Notification settings have been updated successfully.',
        className: 'bg-green-600 text-white border-green-600',
    });
}

/**
 * Show error toast when settings fail to load
 */
export function showSettingsLoadErrorToast() {
    toast({
        title: 'Error',
        description: 'Failed to load notification settings',
        variant: 'destructive',
    });
}

/**
 * Show error toast when settings fail to save
 */
export function showSettingsSaveErrorToast() {
    toast({
        title: 'Error',
        description: 'Failed to save notification settings',
        variant: 'destructive',
    });
}

/**
 * Show success toast when general settings are saved
 */
export function showGeneralSettingsSavedToast() {
    toast({
        title: 'Settings Saved',
        description: 'General settings have been updated successfully.',
        className: 'bg-green-600 text-white border-green-600',
    });
}

/**
 * Show error toast when general settings fail to load
 */
export function showGeneralSettingsLoadErrorToast() {
    toast({
        title: 'Error',
        description: 'Failed to load general settings',
        variant: 'destructive',
    });
}

/**
 * Show error toast when general settings fail to save
 */
export function showGeneralSettingsSaveErrorToast() {
    toast({
        title: 'Error',
        description: 'Failed to save general settings',
        variant: 'destructive',
    });
}
