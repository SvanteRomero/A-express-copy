import { Customer, MessageTemplate } from "./types";

// Helper to get status description and pickup instruction based on workshop status
const getStatusDetails = (workshopStatus?: string) => {
    if (workshopStatus === "Not Solved") {
        return {
            description: "kiko tayari kuchukuliwa. Kwa bahati mbaya, hatukuweza kutatua tatizo hilo",
            instruction: "Tafadhali fika dukani uchukue kifaa chako"
        };
    }
    // Solved or default
    return {
        description: "kimefanikiwa kurekebishwa na kiko tayari kuchukuliwa",
        instruction: "Tafadhali fika dukani wakati wa saa za kazi uchukue kifaa chako"
    };
};

export const replaceTemplateVariables = (template: string, customer: Customer) => {
    const statusDetails = getStatusDetails(customer.workshopStatus);

    const truncate = (str: string = '', length: number) => {
        if (str.length <= length) return str;
        return str.substring(0, length) + '..';
    };

    return template
        .replace(/{customer}/g, truncate(customer.name, 15))
        .replace(/{device}/g, truncate(customer.device, 20))
        .replace(/{taskId}/g, customer.taskDisplayId)
        .replace(/{description}/g, truncate(customer.description, 30))
        .replace(/{status}/g, customer.status.toUpperCase()) // Fallback for simple status
        .replace(/{status_description}/g, statusDetails.description)
        .replace(/{pickup_instruction}/g, statusDetails.instruction)
        .replace(/{notes}/g, customer.deviceNotes ? ` ${truncate(customer.deviceNotes, 25)}` : '')
        .replace(/{cost}|{amount}/g, customer.amount ? `${parseFloat(customer.amount).toLocaleString()}/=` : "0/=")
        .replace(/{outstanding_balance}/g, customer.outstandingBalance ? `${parseFloat(customer.outstandingBalance).toLocaleString()}/=` : "0/=")
        .replace(/{daysWaiting}/g, customer.daysWaiting.toString())
        .replace(/{daysOverdue}/g, Math.max(0, customer.daysWaiting - 7).toString())
};

export function transformTasksToCustomers(
    tasks: any[],
    selectedTaskIds: Set<number>
): Customer[] {
    return tasks
        .filter((task: any) => {
            const hasCustomer = task.customer || task.customer_details;
            return hasCustomer;
        })
        .map((task: any) => {
            const customer = task.customer_details || {};
            const deviceName = `${task.laptop_model_details?.name || ''} ${task.brand || ''}`.trim();
            const phoneNumbersList = customer.phone_numbers?.map((p: any) => p.phone_number) || [];
            const initialPhone = phoneNumbersList[0] || customer.phone_number_1 || '';

            return {
                id: task.id.toString(),
                taskId: task.id,
                taskDisplayId: task.title || task.id.toString(),
                customerId: customer.id ? customer.id.toString() : `unknown-${task.id}`,
                name: (customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`).trim() || 'Unknown Customer',
                phone: initialPhone,
                phoneNumbers: phoneNumbersList,
                selectedPhone: initialPhone,
                device: deviceName || 'Unknown Device',
                description: task.description || '',
                deviceNotes: task.device_notes || '',
                status: task.status,
                workshopStatus: task.workshop_status,
                amount: task.total_cost,
                outstandingBalance: task.outstanding_balance,
                isDebt: task.is_debt && parseFloat(task.outstanding_balance || '0') > 0,
                daysWaiting: Math.floor((Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)),
                selected: selectedTaskIds.has(task.id)
            };
        });
}

