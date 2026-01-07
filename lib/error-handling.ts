import { toast } from '@/hooks/use-toast'

interface ApiError {
    response?: {
        data?: any
        status?: number
    }
    message?: string
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

    let title = 'Error'
    let description = fallbackMessage

    // Extract detailed error from response
    if (error.response?.data) {
        const data = error.response.data

        // Check for specific DRF field errors
        if (typeof data === 'object' && !Array.isArray(data)) {
            // If there's a 'detail' field, it's usually a general error
            if (data.detail) {
                description = data.detail
            }
            // If it's a field validation error map, grab the first one or join them
            else {
                const firstErrorKey = Object.keys(data)[0]
                if (firstErrorKey) {
                    const errorMsg = Array.isArray(data[firstErrorKey])
                        ? data[firstErrorKey][0]
                        : data[firstErrorKey]

                    // Format: "Phone Number: This field is required"
                    const formattedKey = firstErrorKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    description = `${formattedKey}: ${errorMsg}`
                }
            }
        }
        // If it's a list, just take the first item
        else if (Array.isArray(data)) {
            description = data[0]
        }
    } else if (error.message) {
        description = error.message
    }

    toast({
        title,
        description,
        variant: 'destructive',
    })

    return error.response?.data
}
