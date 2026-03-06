/**
 * Toast notification type definitions
 */

export type ToastVariant = 'default' | 'destructive' | 'success' | 'info' | 'warning' | 'purple' | 'indigo';

/**
 * Extensible toast type — plain string so new types can be added without
 * modifying this definition (OCP).
 */
export type ToastType = string;

export interface SmsResult {
    sms_sent?: boolean;
    sms_phone?: string | null;
}
