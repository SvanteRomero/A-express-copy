'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createTask } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { useNotifications } from '@/lib/notification-context'
import { handleApiError } from '@/lib/error-handling'
import { toast } from '@/hooks/use-toast'
import { useTechnicians, useManagers, useWorkshopTechnicians } from '@/hooks/use-users'
import { useBrands } from '@/hooks/use-brands'
import { useLocations } from '@/hooks/use-locations'
import { useCustomers } from '@/hooks/use-customers'
import { useModels } from '@/hooks/use-models'
import { useReferrers } from '@/hooks/use-referrers'

export interface NewTaskFormData {
    title: string
    customer_id: string
    customer_name: string
    customer_phone_numbers: { phone_number: string }[]
    customer_type?: string
    brand: string
    laptop_model: string
    description: string
    urgency: string
    current_location: string
    device_type: string
    device_notes: string
    negotiated_by: string
    assigned_to?: string
    estimated_cost?: number
    is_referred: boolean
    referred_by: string
}

export interface FormErrors {
    [key: string]: string | undefined
}

export interface DuplicatePhoneAlertState {
    isOpen: boolean
    phone: string
    customerName: string
}

const INITIAL_FORM_DATA: NewTaskFormData = {
    title: '',
    customer_id: '',
    customer_name: '',
    customer_phone_numbers: [{ phone_number: '' }],
    customer_type: 'Normal',
    brand: '',
    laptop_model: '',
    description: '',
    urgency: 'Yupo',
    current_location: '',
    device_type: 'Full',
    device_notes: '',
    negotiated_by: '',
    assigned_to: '',
    estimated_cost: 0,
    is_referred: false,
    referred_by: ''
}

export function useNewTaskForm() {
    const { user } = useAuth()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { addNotification } = useNotifications()

    // Form state
    const [formData, setFormData] = useState<NewTaskFormData>(INITIAL_FORM_DATA)
    const [errors, setErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isReferred, setIsReferred] = useState(false)

    // Search states
    const [customerSearch, setCustomerSearch] = useState('')
    const [referrerSearch, setReferrerSearch] = useState('')
    const [modelSearch, setModelSearch] = useState('')
    const [customerPage, setCustomerPage] = useState(1)

    // Duplicate phone alert state
    const [duplicatePhoneAlert, setDuplicatePhoneAlert] = useState<DuplicatePhoneAlertState>({
        isOpen: false,
        phone: '',
        customerName: ''
    })

    // Data hooks
    const { data: technicians, isLoading: isLoadingTechnicians } = useTechnicians()
    const { data: workshopTechnicians, isLoading: isLoadingWorkshopTechnicians } = useWorkshopTechnicians()
    const { data: managers, isLoading: isLoadingManagers } = useManagers()
    const { data: brands, isLoading: isLoadingBrands } = useBrands()
    const { data: locations, isLoading: isLoadingLocations } = useLocations()
    const { data: customers, isLoading: isLoadingCustomers } = useCustomers({ query: customerSearch, page: customerPage })
    const { data: referrers, isLoading: isLoadingReferrers } = useReferrers(referrerSearch)
    const { data: models, isLoading: isLoadingModels } = useModels({ query: modelSearch })

    // Filtered locations based on selected technician
    const [filteredLocations, setFilteredLocations] = useState(locations)

    useEffect(() => {
        if (locations) {
            const selectedTechnicianId = formData.assigned_to
            const allTechnicians = [...(technicians || []), ...(workshopTechnicians || [])]
            const selectedTechnician = allTechnicians.find(t => t.id.toString() === selectedTechnicianId)

            if (selectedTechnician?.is_workshop) {
                setFilteredLocations(locations.filter(l => l.is_workshop))
            } else {
                setFilteredLocations(locations)
            }
        }
    }, [formData.assigned_to, locations, technicians, workshopTechnicians])

    // Set default location
    useEffect(() => {
        if (locations && locations.length > 0) {
            setFormData(prev => ({ ...prev, current_location: locations[0].name }))
        }
    }, [locations])

    // Auto-set negotiated_by for managers
    useEffect(() => {
        if (user?.role === 'Manager') {
            setFormData(prev => ({ ...prev, negotiated_by: user.id.toString() }))
        }
    }, [user])

    // Derived options
    const customerOptions = useMemo(() => {
        return customers?.results?.map((c: any) => ({ label: c.name, value: c.id.toString() })).slice(0, 3) || []
    }, [customers])

    const referrerOptions = useMemo(() => {
        return referrers?.map((r: any) => ({ label: r.name, value: r.id.toString() })) || []
    }, [referrers])

    const modelOptions = useMemo(() => {
        return models?.filter((m: any) => m?.name).map((m: any) => ({ label: m.name, value: m.name })).slice(0, 3) || []
    }, [models])

    const canAssignTechnician = user && (user.role === 'Manager' || user.role === 'Administrator' || user.role === 'Front Desk')

    // Validation
    const validateForm = useCallback((): boolean => {
        const newErrors: FormErrors = {}

        if (!formData.customer_name.trim()) newErrors.customer_name = 'Name is required'

        formData.customer_phone_numbers.forEach((phone, index) => {
            if (!phone.phone_number.trim()) {
                newErrors[`customer_phone_${index}`] = 'Phone is required'
            } else {
                const phoneRegex = /^0\s?\d{3}\s?\d{3}\s?\d{3}$/
                if (!phoneRegex.test(phone.phone_number)) {
                    newErrors[`customer_phone_${index}`] = 'Invalid phone number format. Example: 0XXX XXX XXX'
                }
            }
        })

        if (!formData.brand) newErrors.brand = 'Brand is required'
        if (!formData.laptop_model.trim()) newErrors.laptop_model = 'Model is required'

        if (!formData.estimated_cost || formData.estimated_cost <= 0) {
            newErrors.estimated_cost = 'Estimated cost is required and must be greater than 0'
        }

        if (!formData.description.trim()) newErrors.description = 'Description is required'
        if (!formData.urgency) newErrors.urgency = 'Urgency is required'
        if (!formData.current_location) newErrors.current_location = 'Location is required'
        if ((formData.device_type === 'Not Full' || formData.device_type === 'Motherboard Only') && !formData.device_notes.trim()) {
            newErrors.device_notes = 'Device notes are required for this device type'
        }

        if (formData.is_referred && !formData.referred_by.trim()) {
            newErrors.referred_by = 'Referred by is required when task is referred'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }, [formData])

    // Handlers
    const handleInputChange = useCallback((field: keyof NewTaskFormData, value: any) => {
        setFormData(prev => {
            const newFormData = { ...prev, [field]: value }
            if (field === 'device_type' && value === 'Motherboard Only') {
                newFormData.laptop_model = 'Motherboard'
            } else if (field === 'device_type' && prev.laptop_model === 'Motherboard') {
                newFormData.laptop_model = ''
            }
            return newFormData
        })
        setErrors(prev => ({ ...prev, [field]: undefined }))
    }, [])

    const handlePhoneNumberChange = useCallback((index: number, value: string) => {
        setFormData(prev => {
            const newPhoneNumbers = [...prev.customer_phone_numbers]
            newPhoneNumbers[index] = { phone_number: value }
            return { ...prev, customer_phone_numbers: newPhoneNumbers }
        })
        setErrors(prev => ({ ...prev, [`customer_phone_${index}`]: undefined }))
    }, [])

    const addPhoneNumber = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            customer_phone_numbers: [...prev.customer_phone_numbers, { phone_number: '' }]
        }))
    }, [])

    const removePhoneNumber = useCallback((index: number) => {
        setFormData(prev => {
            const newPhoneNumbers = [...prev.customer_phone_numbers]
            newPhoneNumbers.splice(index, 1)
            return { ...prev, customer_phone_numbers: newPhoneNumbers }
        })
    }, [])

    const handleReferredChange = useCallback((checked: boolean) => {
        setIsReferred(checked)
        handleInputChange('is_referred', checked)
    }, [handleInputChange])

    const handleCustomerSelect = useCallback((value: string) => {
        const selectedCustomer = customers?.results?.find((c: any) => c.id.toString() === value)
        if (selectedCustomer) {
            setFormData(prev => ({
                ...prev,
                customer_id: selectedCustomer.id.toString(),
                customer_name: selectedCustomer.name,
                customer_phone_numbers: selectedCustomer.phone_numbers,
                customer_type: selectedCustomer.customer_type
            }))
        } else {
            setFormData(prev => ({ ...prev, customer_id: '' }))
        }
    }, [customers])

    const handleReferrerSelect = useCallback((value: string) => {
        const selectedReferrer = referrers?.find((r: any) => r.id.toString() === value)
        if (selectedReferrer) {
            handleInputChange('referred_by', selectedReferrer.name)
        } else {
            handleInputChange('referred_by', value)
        }
    }, [referrers, handleInputChange])

    const closeDuplicatePhoneAlert = useCallback(() => {
        setDuplicatePhoneAlert({ isOpen: false, phone: '', customerName: '' })
    }, [])

    const handleSuccessRedirect = useCallback(() => {
        if (user?.role === 'Manager') {
            router.push('/dashboard/manager/tasks')
        } else if (user?.role === 'Front Desk') {
            router.push('/dashboard/front-desk/tasks')
        } else {
            router.push('/dashboard/tasks')
        }
    }, [user, router])

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateForm()) return

        setIsSubmitting(true)
        try {
            const taskData = {
                ...formData,
                customer: {
                    id: formData.customer_id,
                    name: formData.customer_name,
                    phone_numbers_write: formData.customer_phone_numbers,
                    customer_type: formData.customer_type,
                },
                negotiated_by: formData.negotiated_by || null,
                referred_by: formData.is_referred ? formData.referred_by : null,
            }
            const response = await createTask(taskData)

            if (response.data.customer_created) {
                toast({
                    title: 'Customer Created',
                    description: `Customer ${formData.customer_name} has been added to the database.`,
                })
            }

            toast({
                title: 'Task Created!',
                description: 'The new task has been added to the system.',
                className: "bg-green-600 text-white border-green-600",
            })

            addNotification({
                title: "New Task Created",
                message: `Task for ${formData.customer_name} (${formData.device_type}) has been created successfully.`,
                type: "success",
                priority: "medium",
                actionUrl: "/dashboard/tasks"
            })

            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            queryClient.invalidateQueries({ queryKey: ['customers'] })

            handleSuccessRedirect()
        } catch (error: any) {
            if (error.response?.data?.phone_number_duplicate) {
                const { phone, customer_name } = error.response.data.phone_number_duplicate
                setDuplicatePhoneAlert({
                    isOpen: true,
                    phone: phone,
                    customerName: customer_name
                })
                return
            }

            handleApiError(error, 'Failed to create task. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }, [formData, validateForm, addNotification, queryClient, handleSuccessRedirect])

    return {
        // Form state
        formData,
        errors,
        isSubmitting,
        isReferred,

        // Alert state
        duplicatePhoneAlert,
        closeDuplicatePhoneAlert,

        // Data
        technicians,
        workshopTechnicians,
        managers,
        brands,
        locations,
        filteredLocations,
        customers,
        referrers,
        models,

        // Loading states
        isLoadingTechnicians,
        isLoadingWorkshopTechnicians,
        isLoadingManagers,
        isLoadingBrands,
        isLoadingLocations,
        isLoadingCustomers,
        isLoadingReferrers,
        isLoadingModels,

        // Derived options
        customerOptions,
        referrerOptions,
        modelOptions,
        canAssignTechnician,

        // Search setters
        setCustomerSearch,
        setReferrerSearch,
        setModelSearch,

        // Handlers
        handleInputChange,
        handlePhoneNumberChange,
        addPhoneNumber,
        removePhoneNumber,
        handleReferredChange,
        handleCustomerSelect,
        handleReferrerSelect,
        handleSubmit,
        handleBack: () => router.back(),

        // User
        user,
    }
}

export type UseNewTaskFormReturn = ReturnType<typeof useNewTaskForm>
