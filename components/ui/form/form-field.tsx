import type React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Label } from '@/components/ui/core/label'

interface FormFieldProps {
    id: string
    label: string
    required?: boolean
    error?: string
    children: React.ReactNode
}

/**
 * Reusable form field wrapper with label and error display
 */
export function FormField({
    id,
    label,
    required = false,
    error,
    children,
}: FormFieldProps) {
    return (
        <div className='space-y-1.5'>
            <Label htmlFor={id} className='font-medium'>
                {label}
                {required && <span className='text-red-500 ml-1'>*</span>}
            </Label>
            {children}
            {error && (
                <p className='text-sm text-red-600 flex items-center gap-1'>
                    <AlertTriangle className='h-4 w-4' />
                    {error}
                </p>
            )}
        </div>
    )
}
