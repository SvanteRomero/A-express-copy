import { UserResponse } from "@/components/users/types";
import { Customer, PhoneNumber, Referrer } from "@/components/customers/types";
import { Brand } from "@/components/brands/types";

export interface PaginatedTasks {
    count: number;
    next: string | null;
    previous: string | null;
    results: Task[];
}


export interface CostBreakdown {
    id: number;
    description: string;
    amount: string;
    cost_type: 'Additive' | 'Subtractive' | 'Inclusive';
    category: string;
    created_at: string;
    status: string;
}

export interface Task {
    laptop_model_details: any;
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    assigned_to: number;
    assigned_to_details: UserResponse;
    created_by: number;
    created_by_details: UserResponse;
    created_at: string;
    updated_at: string;
    due_date: string;
    customer_name: string;
    customer_phone_numbers: PhoneNumber[];
    customer_details: Customer;
    brand: number;
    brand_details: Brand;
    device_type: string;
    device_notes: string;
    laptop_model: string;
    estimated_cost: string;
    total_cost: string;
    payment_status: string;
    current_location: string;
    urgency: string;
    date_in: string;
    approved_date: string;
    paid_date: string;
    date_out: string;
    negotiated_by: number | null;
    negotiated_by_details: UserResponse | null;
    activities: any[];
    payments: any[];
    outstanding_balance: number;
    is_commissioned: boolean;
    commissioned_by: string;
    cost_breakdowns: CostBreakdown[];
    approved_by: number;
    approved_at: string;
    is_debt: boolean;
    qc_notes: string;
    workshop_status: string | null;
    sent_out_by: number;
    original_technician_snapshot?: number | null;
    original_location_snapshot?: string | null;
    latest_pickup_at?: string | null;
    latest_pickup_by?: number | null;
    original_technician?: number | null;
    original_technician_details?: UserResponse | null;
    referred_by: string;
    referred_by_details: Referrer;
    workshop_location?: number | null;
    workshop_technician?: number | null;
}

export interface TaskActivity {
    id: number;
    task: number;
    user: UserResponse;
    type: string;
    message: string;
    timestamp: string;
}

export interface TaskPayment {
    id: number;
    task: number;
    amount: string;
    method: string;
    date: string;
    reference: string;
}

export interface ExpenditureRequest {
    id: number;
    description: string;
    amount: string;
    task: number | null;
    task_title: string | null;
    status: string;
    category_name?: string;
    payment_method_name?: string;
    requester: { username: string } | null;
    requester_name: string | null;
    approver: { username: string } | null;
    approver_name: string | null;
}

export interface PaymentCategory {
    id: number;
    name: string;
}
