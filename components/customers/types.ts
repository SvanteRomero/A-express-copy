export interface Referrer {
    id: number;
    name: string;
    phone: string;
}

export interface PhoneNumber {
    id: number;
    phone_number: string;
}

export interface Customer {
    id: number;
    name: string;
    customer_type: string;
    phone_numbers: PhoneNumber[];
    has_debt: boolean;
    tasks_count: number;
}
