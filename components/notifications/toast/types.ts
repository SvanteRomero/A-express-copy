/**
 * Toast notification type definitions
 */

export type ToastVariant = 'default' | 'destructive';

export interface ToastConfig {
    title: string;
    description: string;
    variant?: ToastVariant;
    className?: string;
}

export interface SmsResult {
    sms_sent?: boolean;
    sms_phone?: string | null;
}
