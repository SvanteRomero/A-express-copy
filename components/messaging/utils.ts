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

export const getStatusColor = (status: string) => {
    switch (status) {
        case "Ready for Pickup":
            return "bg-green-100 text-green-800 hover:bg-green-100";
        case "In Progress":
            return "bg-blue-100 text-blue-800 hover:bg-blue-100";
        case "Awaiting Parts":
            return "bg-orange-100 text-orange-800 hover:bg-orange-100";
        case "Quote Sent":
            return "bg-purple-100 text-purple-800 hover:bg-purple-100";
        default:
            return "secondary";
    }
}
