/**
 * Account management toast notifications.
 * Uses the CRUD factory from common-toasts to eliminate boilerplate.
 */

import { showCrudToast, showCrudErrorToast } from './common-toasts';

export function showAccountCreatedToast() {
    showCrudToast('Account', 'created');
}

export function showAccountCreateErrorToast(errorMessage: string) {
    showCrudErrorToast('account', 'create', errorMessage);
}

export function showAccountUpdatedToast() {
    showCrudToast('Account', 'updated');
}

export function showAccountUpdateErrorToast(errorMessage: string) {
    showCrudErrorToast('account', 'update', errorMessage);
}

export function showAccountDeletedToast() {
    showCrudToast('Account', 'deleted');
}

export function showAccountDeleteErrorToast() {
    showCrudErrorToast('account', 'delete');
}
