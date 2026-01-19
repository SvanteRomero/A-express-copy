/**
 * Financial page toast notifications
 */

import { toast } from '@/hooks/use-toast';

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

/**
 * Show success toast when expenditure request is approved
 */
export function showExpenditureApprovedToast() {
    toast({
        title: 'Success',
        description: 'Expenditure request approved.',
    });
}

/**
 * Show error toast when expenditure approval fails
 */
export function showExpenditureApprovalErrorToast(errorMessage?: string) {
    toast({
        title: 'Error',
        description: errorMessage || 'Failed to approve request.',
        variant: 'destructive',
    });
}

/**
 * Show success toast when expenditure request is rejected
 */
export function showExpenditureRejectedToast() {
    toast({
        title: 'Success',
        description: 'Expenditure request rejected.',
    });
}

/**
 * Show error toast when expenditure rejection fails
 */
export function showExpenditureRejectionErrorToast(errorMessage?: string) {
    toast({
        title: 'Error',
        description: errorMessage || 'Failed to reject request.',
        variant: 'destructive',
    });
}

/**
 * Show success toast when expenditure request is created
 */
export function showExpenditureRequestCreatedToast(isRefund: boolean, autoApproved: boolean) {
    const type = isRefund ? 'Refund' : 'Expenditure';
    const action = autoApproved ? 'created and approved' : 'created';
    toast({
        title: 'Success',
        description: `${type} request ${action} successfully.`,
    });
}

/**
 * Show error toast when expenditure request creation fails
 */
export function showExpenditureRequestErrorToast(isRefund: boolean, errorMessage?: string) {
    const type = isRefund ? 'refund' : 'expenditure';
    toast({
        title: 'Error',
        description: errorMessage || `Failed to create ${type} request.`,
        variant: 'destructive',
    });
}
/**
 * Show success toast when expenditure request is cancelled
 */
export function showExpenditureCancelledToast() {
    toast({
        title: 'Success',
        description: 'Expenditure request cancelled.',
    });
}

/**
 * Show error toast when expenditure cancellation fails
 */
export function showExpenditureCancellationErrorToast(errorMessage?: string) {
    toast({
        title: 'Error',
        description: errorMessage || 'Failed to cancel request.',
        variant: 'destructive',
    });
}

/**
 * Show success toast when payment method is created
 */
export function showPaymentMethodCreatedToast() {
    toast({
        title: 'Success',
        description: 'Payment method created successfully.',
    });
}

/**
 * Show success toast when payment method is updated
 */
export function showPaymentMethodUpdatedToast() {
    toast({
        title: 'Success',
        description: 'Payment method updated successfully.',
    });
}

/**
 * Show success toast when payment method is deleted
 */
export function showPaymentMethodDeletedToast() {
    toast({
        title: 'Success',
        description: 'Payment method deleted successfully.',
    });
}

/**
 * Show error toast for payment method operations
 */
export function showPaymentMethodErrorToast(action: string, errorMessage?: string) {
    toast({
        title: 'Error',
        description: errorMessage || `Failed to ${action} payment method.`,
        variant: 'destructive',
    });
}
