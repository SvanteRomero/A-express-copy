/**
 * Financial page toast notifications.
 * Uses CRUD factory for payment method toasts.
 * Transaction-specific toasts kept as-is due to unique parameterization.
 */

import { toast } from '@/hooks/use-toast';
import { showCrudToast, showCrudErrorToast } from './common-toasts';

/**
 * Show error toast for invalid payment amount
 */
export function showInvalidPaymentAmountToast() {
    toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Payment amount cannot be greater than the outstanding balance.',
    });
}

// =====================================================
// Expenditure Request Toasts (Legacy — kept for backward compat)
// =====================================================

export function showExpenditureApprovedToast() {
    showCrudToast('Expenditure request', 'saved');
}

export function showExpenditureApprovalErrorToast(errorMessage?: string) {
    showCrudErrorToast('expenditure request', 'save', errorMessage || 'Failed to approve request.');
}

export function showExpenditureRejectedToast() {
    toast({ title: 'Success', description: 'Expenditure request rejected.' });
}

export function showExpenditureRejectionErrorToast(errorMessage?: string) {
    showCrudErrorToast('expenditure request', 'save', errorMessage || 'Failed to reject request.');
}

export function showExpenditureRequestCreatedToast(isRefund: boolean, autoApproved: boolean) {
    const type = isRefund ? 'Refund' : 'Expenditure';
    const action = autoApproved ? 'created and approved' : 'created';
    toast({ title: 'Success', description: `${type} request ${action} successfully.` });
}

export function showExpenditureRequestErrorToast(isRefund: boolean, errorMessage?: string) {
    const type = isRefund ? 'refund' : 'expenditure';
    showCrudErrorToast(`${type} request`, 'create', errorMessage);
}

export function showExpenditureCancelledToast() {
    toast({ title: 'Success', description: 'Expenditure request cancelled.' });
}

export function showExpenditureCancellationErrorToast(errorMessage?: string) {
    showCrudErrorToast('expenditure request', 'save', errorMessage || 'Failed to cancel request.');
}

// =====================================================
// Transaction Request Toasts (Unified for Revenue/Expenditure)
// =====================================================

export function showTransactionRequestCreatedToast(
    transactionType: 'Expenditure' | 'Revenue',
    autoApproved: boolean
) {
    const action = autoApproved ? 'created and approved' : 'submitted for approval';
    toast({ title: 'Success', description: `${transactionType} request ${action} successfully.` });
}

export function showTransactionRequestErrorToast(
    transactionType: 'Expenditure' | 'Revenue',
    errorMessage?: string
) {
    showCrudErrorToast(`${transactionType.toLowerCase()} request`, 'create', errorMessage);
}

export function showTransactionApprovedToast(transactionType?: 'Expenditure' | 'Revenue') {
    toast({ title: 'Success', description: `${transactionType || 'Transaction'} request approved.` });
}

export function showTransactionRejectedToast(transactionType?: 'Expenditure' | 'Revenue') {
    toast({ title: 'Success', description: `${transactionType || 'Transaction'} request rejected.` });
}

export function showTransactionCancelledToast(transactionType?: 'Expenditure' | 'Revenue') {
    toast({ title: 'Success', description: `${transactionType || 'Transaction'} request cancelled.` });
}

// =====================================================
// Payment Method Toasts (CRUD factory)
// =====================================================

export function showPaymentMethodCreatedToast() {
    showCrudToast('Payment method', 'created');
}

export function showPaymentMethodUpdatedToast() {
    showCrudToast('Payment method', 'updated');
}

export function showPaymentMethodDeletedToast() {
    showCrudToast('Payment method', 'deleted');
}

export function showPaymentMethodErrorToast(action: string, errorMessage?: string) {
    showCrudErrorToast('payment method', action as any, errorMessage);
}
