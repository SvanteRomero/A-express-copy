import { showErrorToast } from '@/components/notifications/toast'

interface ApiError {
    response?: {
        data?: any
        status?: number
    }
    message?: string
}

function extractErrorDescription(data: unknown, fallback: string): string {
    if (Array.isArray(data)) return data[0] as string
    if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>
        if (obj.detail) return obj.detail as string
        const firstKey = Object.keys(obj)[0]
        if (firstKey) {
            const errVal = obj[firstKey]
            const errMsg = Array.isArray(errVal) ? errVal[0] : errVal
            const formatted = firstKey.replaceAll('_', ' ').replaceAll(/\b\w/g, l => l.toUpperCase())
            return `${formatted}: ${errMsg}`
        }
    }
    return fallback
}

/**
 * Standardized error handling for API requests.
 * Extracts the most relevant error message from Django/DRF responses and displays a toast.
 *
 * @param error - The error object from the catch block
 * @param fallbackMessage - A default message if no specific error can be extracted
 * @returns The extracted error data (if any) for further custom handling
 */
export function handleApiError(error: ApiError, fallbackMessage: string = 'An unexpected error occurred') {
    console.error('API Error:', error)

    const title = 'Error'
    let description = fallbackMessage

    if (error.response?.data) {
        description = extractErrorDescription(error.response.data, fallbackMessage)
    } else if (error.message) {
        description = error.message
    }

    showErrorToast(title, description)

    return error.response?.data
}
