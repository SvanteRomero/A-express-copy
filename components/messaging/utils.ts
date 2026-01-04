import { Customer, MessageTemplate } from "./types";

const getSwahiliStatus = (status: string, workshopStatus?: string) => {
    // Special case for workshop returns
    if (workshopStatus === "Not Solved") return "TAYARI KUCHUKULIWA, HAIJAPONA";
    if (workshopStatus === "Solved") return "TAYARI KUCHUKULIWA, IMEPONA";

    // Standard statuses
    const s = status.toLowerCase();
    if (s.includes('ready') || s === 'completed') return "TAYARI KUCHUKULIWA";
    if (s.includes('progress') || s.includes('diagnostic')) return "INAREKEBISHWA";
    if (s.includes('picked')) return "IMESHACHUKULIWA";
    return status.toUpperCase();
};

export const replaceTemplateVariables = (template: string, customer: Customer) => {
    return template
        .replace(/{customer}/g, customer.name)
        .replace(/{device}/g, customer.device)
        .replace(/{taskId}/g, customer.taskDisplayId)
        .replace(/{description}/g, customer.description)
        .replace(/{status}/g, getSwahiliStatus(customer.status, customer.workshopStatus))
        .replace(/{notes}/g, customer.deviceNotes ? `||| Maelezo: ${customer.deviceNotes}` : '')
        // .replace(/{service}/g, customer.service) // Not in type yet
        // .replace(/{amount}/g, customer.amount) // Not in type yet
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
