/**
 * Task form option constants
 * Extracted from new-task-form.tsx for reusability
 */

export const URGENCY_OPTIONS = [
    { value: 'Yupo', label: 'Yupo' },
    { value: 'Katoka kidogo', label: 'Katoka kidogo' },
    { value: 'Kaacha', label: 'Kaacha' },
    { value: 'Expedited', label: 'Expedited' },
    { value: 'Ina Haraka', label: 'Ina Haraka' },
] as const

export const CUSTOMER_TYPE_OPTIONS = [
    { value: 'Normal', label: 'Normal' },
    { value: 'Repairman', label: 'Repairman' },
] as const

export const DEVICE_TYPE_OPTIONS = [
    { value: 'Full', label: 'Full' },
    { value: 'Not Full', label: 'Not Full' },
    { value: 'Motherboard Only', label: 'Motherboard Only' },
] as const

export type UrgencyValue = typeof URGENCY_OPTIONS[number]['value']
export type CustomerTypeValue = typeof CUSTOMER_TYPE_OPTIONS[number]['value']
export type DeviceTypeValue = typeof DEVICE_TYPE_OPTIONS[number]['value']
