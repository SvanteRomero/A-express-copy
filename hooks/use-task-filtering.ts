import { useState, useCallback } from "react"
import { useTasks, useTaskUrgencyOptions, useTaskWorkshopStatusOptions } from "@/hooks/use-tasks"
import { useTechnicians } from "@/hooks/use-users"
import { getLocations } from "@/lib/api-client"
import { useEffect } from "react"

export interface UseTaskFilteringProps {
    initialStatus?: string
    initialTechnician?: string | number
    initialUrgency?: string
    initialDeviceStatus?: string
    initialLocation?: string
    initialPage?: number
    pageSize?: number
    excludeStatus?: string // e.g., for "Not Completed" tabs
    exactStatus?: string  // e.g., for "Completed" tabs
    extraParams?: Record<string, any> // For specific filters like unpaid_tasks: true
    isWorkshopContext?: boolean
}

export function useTaskFiltering(props: UseTaskFilteringProps = {}) {
    const [page, setPage] = useState(props.initialPage || 1)
    const [searchQuery, setSearchQuery] = useState("")

    // Filter states
    const [taskStatusFilter, setTaskStatusFilter] = useState("all")
    const [technicianFilter, setTechnicianFilter] = useState<string | number>(props.initialTechnician || "all")
    const [urgencyFilter, setUrgencyFilter] = useState(props.initialUrgency || "all")
    const [deviceStatusFilter, setDeviceStatusFilter] = useState(props.initialDeviceStatus || "all")
    const [locationFilter, setLocationFilter] = useState(props.initialLocation || "all")

    // Reset page when filters change
    const handleFilterChange = (setter: any) => (value: any) => {
        setter(value)
        setPage(1)
    }

    const handleSearchChange = useCallback((query: string) => {
        setSearchQuery(query)
        setPage(1)
    }, [])

    // Derived filters for API
    const apiStatus = props.exactStatus
        ? props.exactStatus
        : (taskStatusFilter === "all" ? props.initialStatus : taskStatusFilter)

    // Construct API params
    const assignedToParam = props.isWorkshopContext && technicianFilter !== "all"
        ? undefined
        : (technicianFilter === "all" ? undefined : Number(technicianFilter))

    const workshopTechUserParam = props.isWorkshopContext && technicianFilter !== "all"
        ? Number(technicianFilter)
        : undefined

    const { data: tasksData, isLoading, isError, error, refetch } = useTasks({
        page,
        page_size: props.pageSize || 10,
        search: searchQuery,
        status: apiStatus,
        assigned_to: assignedToParam,
        workshop_tech_user: workshopTechUserParam,
        urgency: urgencyFilter === "all" ? undefined : urgencyFilter,
        location: locationFilter === "all" ? undefined : locationFilter,
        workshop_status: deviceStatusFilter === "all" ? undefined : deviceStatusFilter,
        exclude_status: props.excludeStatus,
        ...props.extraParams
    })

    // Options Fetching
    const { data: technicians } = useTechnicians()
    const { data: urgencyOptions } = useTaskUrgencyOptions()
    const { data: workshopStatusOptions } = useTaskWorkshopStatusOptions()
    const [locations, setLocations] = useState<{ id: number, name: string }[]>([])

    useEffect(() => {
        getLocations().then(res => {
            setLocations(res.data?.results || res.data || [])
        }).catch(console.error)
    }, [])

    const filterOptions = {
        urgencies: urgencyOptions?.map((o: any) => o[0]) || [],
        deviceStatuses: workshopStatusOptions?.map((o: any) => o[0]) || [],
        locations: locations,
    }

    const serverSideFilters = {
        technicianId: technicianFilter,
        setTechnicianId: handleFilterChange(setTechnicianFilter),
        urgency: urgencyFilter,
        setUrgency: handleFilterChange(setUrgencyFilter),
        deviceStatus: deviceStatusFilter,
        setDeviceStatus: handleFilterChange(setDeviceStatusFilter),
        location: locationFilter,
        setLocation: handleFilterChange(setLocationFilter),
        taskStatus: taskStatusFilter,
        setTaskStatus: handleFilterChange(setTaskStatusFilter),
    }

    const clearFilters = () => {
        setSearchQuery("")
        setTaskStatusFilter("all")
        setTechnicianFilter(props.initialTechnician || "all")
        setUrgencyFilter(props.initialUrgency || "all")
        setDeviceStatusFilter(props.initialDeviceStatus || "all")
        setLocationFilter(props.initialLocation || "all")
        setPage(1)
    }

    return {
        // Data
        tasks: tasksData?.results || [],
        count: tasksData?.count || 0,
        next: tasksData?.next,
        previous: tasksData?.previous,
        isLoading,
        isError,
        error,
        refetch,

        // Pagination
        page,
        setPage,

        // Search
        searchQuery,
        setSearchQuery: handleSearchChange, // Use the callback that resets page

        // Filters (for TasksDisplay)
        serverSideFilters,
        filterOptions,
        technicians: technicians || [],

        // Utilities
        clearFilters
    }
}
