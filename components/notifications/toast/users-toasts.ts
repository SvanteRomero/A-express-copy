/**
 * User management toast notifications.
 * Uses the CRUD factory from common-toasts to eliminate boilerplate.
 */

import { showCrudToast, showCrudErrorToast } from './common-toasts';

export function showUserCreatedToast(username: string) {
    showCrudToast('User', 'created', username);
}

export function showUserCreateErrorToast(errorMessage: string) {
    showCrudErrorToast('user', 'create', errorMessage);
}

export function showUserUpdatedToast(username: string) {
    showCrudToast('User', 'updated', username);
}

export function showUserUpdateErrorToast(errorMessage: string) {
    showCrudErrorToast('user', 'update', errorMessage);
}

export function showUserDeletedToast() {
    showCrudToast('User', 'deleted');
}

export function showUserDeleteErrorToast(errorMessage: string) {
    showCrudErrorToast('user', 'delete', errorMessage);
}

export function showPasswordChangedToast(username: string) {
    showCrudToast('Password', 'updated', username);
}

export function showPasswordChangeErrorToast(errorMessage: string) {
    showCrudErrorToast('password', 'update', errorMessage);
}
