export interface Customer {
    id: string; // Likely maps to 'task_id' or a composite in frontend, but backend uses Task ID for sending
    taskId: number;
    taskDisplayId: string;
    customerId: string; // For grouping
    name: string;
    phone: string;
    phoneNumbers: string[];
    selectedPhone: string;
    device: string;
    description: string;
    deviceNotes: string;
    status: string;
    workshopStatus?: string;
    amount?: string;
    outstandingBalance?: string;
    isDebt?: boolean;
    daysWaiting: number;
    selected?: boolean;
}

export interface MessageTemplate {
    id?: number;
    key?: string;
    name: string;
    content: string;
    is_active?: boolean;
    is_default?: boolean;
}

export interface MessageLog {
    id: number;
    taskId: number;
    recipient_phone: string;
    message_content: string;
    customer_name: string; // Serializer sends snake_case
    sent_by_name: string;
    sent_at: string; // Serializer sends snake_case
    status: "sent" | "failed" | "pending";
}

export interface BulkSendPayload {
    recipients: { task_id: number; phone: string }[];
    message?: string;
    template_id?: number;
    template_key?: string;
}
