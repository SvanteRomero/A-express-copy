/**
 * Centralized Toast Notification System
 * 
 * This module provides a centralized location for all toast notifications
 * in the application, organized by page/feature.
 * 
 * Usage:
 * ```typescript
 * import { showTaskApprovedToast } from '@/components/notifications/toast';
 * 
 * // In your component
 * showTaskApprovedToast({ sms_sent: true, sms_phone: '+254...' });
 * ```
 */

// Re-export the core toast hook and function
export { toast, useToast } from '@/hooks/use-toast';

// Re-export types
export type { ToastConfig, ToastVariant, SmsResult } from './types';

// Re-export common toasts
export {
    showSuccessToast,
    showErrorToast,
    showGreenSuccessToast,
    showSmsResultToast,
} from './common-toasts';

// Re-export front desk toasts
export {
    showTaskApprovedToast,
    showTaskApprovalErrorToast,
    showTaskPickedUpToast,
    showPickupErrorToast,
    showPaymentRequiredToast,
} from './front-desk-toasts';

// Re-export accountant toasts
export {
    showPaymentAddedToast,
    showReminderSentToast,
    showReminderFailedToast,
    showNoPhoneToast,
    showTaskNotFoundToast,
    showMarkedAsPaidToast,
} from './accountant-toasts';

// Re-export task toasts
export {
    showTaskCreatedToast,
    showCustomerCreatedToast,
    showTaskCreatedWithSmsToast,
    showTaskCreationErrorToast,
    showTaskMarkedAsDebtToast,
    showMarkAsDebtErrorToast,
    showRepairManagementSavedToast,
    showFinancialsSavedToast,
    showCustomerNotificationToast,
    showPhoneCopiedToast,
    showPhoneCopyErrorToast,
    showCustomerUpdateSentToast,
    showCustomerUpdateFailedToast,
    showMessageRequiredToast,
    showPhoneRequiredToast,
    showPreviewFailedToast,
} from './tasks-toasts';

// Re-export settings toasts
export {
    showSettingsSavedToast,
    showSettingsLoadErrorToast,
    showSettingsSaveErrorToast,
    showGeneralSettingsSavedToast,
    showGeneralSettingsLoadErrorToast,
    showGeneralSettingsSaveErrorToast,
} from './settings-toasts';

// Re-export user toasts
export {
    showUserCreatedToast,
    showUserCreateErrorToast,
    showUserUpdatedToast,
    showUserUpdateErrorToast,
    showUserDeletedToast,
    showUserDeleteErrorToast,
    showPasswordChangedToast,
    showPasswordChangeErrorToast,
} from './users-toasts';

// Re-export account toasts
export {
    showAccountCreatedToast,
    showAccountCreateErrorToast,
    showAccountUpdatedToast,
    showAccountUpdateErrorToast,
    showAccountDeletedToast,
    showAccountDeleteErrorToast,
} from './accounts-toasts';

// Re-export financial toasts
export {
    showInvalidPaymentAmountToast,
    showExpenditureApprovedToast,
    showExpenditureApprovalErrorToast,
    showExpenditureRejectedToast,
    showExpenditureRejectionErrorToast,
    showExpenditureRequestCreatedToast,
    showExpenditureRequestErrorToast,
    showExpenditureCancelledToast,
    showExpenditureCancellationErrorToast,
    showPaymentMethodCreatedToast,
    showPaymentMethodUpdatedToast,
    showPaymentMethodDeletedToast,
    showPaymentMethodErrorToast,
} from './financials-toasts';

// Re-export scheduler toasts
export {
    showSchedulerSuccessToast,
    showSchedulerPartialFailureToast,
    showSchedulerNoTasksToast,
    showSchedulerNotificationToast,
} from './scheduler-toasts';

// Re-export technician toasts
export {
    showSentToWorkshopToast,
    showWorkshopSelectionErrorToast,
    showWorkshopStatusChangedToast,
} from './technician-toasts';

// Re-export WebSocket toast dispatcher
export { dispatchWebSocketToast } from './websocket-toasts';

