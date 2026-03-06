/**
 * Settings page toast notifications.
 * Uses the CRUD factory from common-toasts to eliminate boilerplate.
 */

import { showCrudToast, showCrudErrorToast } from './common-toasts';

export function showSettingsSavedToast() {
    showCrudToast('Notification settings', 'saved');
}

export function showSettingsLoadErrorToast() {
    showCrudErrorToast('notification settings', 'load');
}

export function showSettingsSaveErrorToast() {
    showCrudErrorToast('notification settings', 'save');
}

export function showGeneralSettingsSavedToast() {
    showCrudToast('General settings', 'saved');
}

export function showGeneralSettingsLoadErrorToast() {
    showCrudErrorToast('general settings', 'load');
}

export function showGeneralSettingsSaveErrorToast() {
    showCrudErrorToast('general settings', 'save');
}
