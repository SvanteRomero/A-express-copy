/**
 * Toast notification type definitions
 */

export type ToastVariant = 'default' | 'destructive' | 'success' | 'info' | 'warning' | 'purple' | 'indigo';

export interface SmsResult {
    sms_sent?: boolean;
    sms_phone?: string | null;
}
