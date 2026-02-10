export interface PaymentMethod {
    id: number;
    name: string;
}

// ============================================================================
// Approval Request Types (Unified System)
// ============================================================================

/**
 * Base interface for all approval requests
 */
export interface BaseApprovalRequest {
    id: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    requester_name: string;
    approver_name: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Transaction Request (Expenditure or Revenue)
 */
export interface TransactionRequest extends BaseApprovalRequest {
    request_type: 'transaction';
    transaction_type: 'Expenditure' | 'Revenue';
    description: string;
    amount: string;
    category: { id: number; name: string };
    payment_method?: { id: number; name: string } | null;
    payment_method_name?: string | null;
    task?: number | null;
    task_title?: string | null;
    cost_type?: 'Additive' | 'Subtractive' | 'Inclusive' | null;
}

/**
 * Debt Request
 */
export interface DebtRequest extends BaseApprovalRequest {
    request_type: 'debt';
    task: number;
    task_title: string;
    task_details?: {
        id: number;
        title: string;
        customer_name: string | null;
        outstanding_balance: string;
    } | null;
}

/**
 * Discriminated union for polymorphic handling
 */
export type UnifiedApprovalRequest = TransactionRequest | DebtRequest;

/**
 * Type guard for TransactionRequest
 */
export function isTransactionRequest(request: UnifiedApprovalRequest): request is TransactionRequest {
    return request.request_type === 'transaction';
}

/**
 * Type guard for DebtRequest
 */
export function isDebtRequest(request: UnifiedApprovalRequest): request is DebtRequest {
    return request.request_type === 'debt';
}
