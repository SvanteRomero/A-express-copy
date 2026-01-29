
import { useState, useMemo, useEffect } from "react"

export interface TaskSorting {
    sortField: string | null
    sortDirection: "asc" | "desc" | null
}

export interface TaskFiltersState {
    searchQuery: string
    taskStatusFilter: string
    technicianFilter: string
    urgencyFilter: string
    deviceStatusFilter: string
    locationFilter: string
}

interface UseTaskFilteringProps {
    externalSearchQuery?: string;
    onSearchChange?: (query: string) => void;
}

export function useTaskFiltering(tasks: any[], technicians: any[], props?: UseTaskFilteringProps) {
    const isServerSideSearch = props?.onSearchChange !== undefined;

    // Always maintain internal state for instant UI feedback
    const [internalSearchQuery, setInternalSearchQuery] = useState(props?.externalSearchQuery || "")

    // Sync external -> internal (e.g. clear filters from parent, or initial load)
    useEffect(() => {
        if (props?.externalSearchQuery !== undefined && props.externalSearchQuery !== internalSearchQuery) {
            setInternalSearchQuery(props.externalSearchQuery)
        }
    }, [props?.externalSearchQuery])

    // Sync internal -> external (Debounced)
    useEffect(() => {
        if (isServerSideSearch && props?.onSearchChange) {
            const handler = props.onSearchChange;
            const timer = setTimeout(() => {
                // Avoid calling if the value hasn't effectively changed from what server likely has 
                // (though handling that check is complex without refs, simple debounce is usually sufficient)
                if (props.externalSearchQuery !== internalSearchQuery) {
                    handler(internalSearchQuery)
                }
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [internalSearchQuery, isServerSideSearch, props?.onSearchChange, props?.externalSearchQuery])

    const setSearchQuery = (query: string) => {
        setInternalSearchQuery(query)
    }

    const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all")
    const [technicianFilter, setTechnicianFilter] = useState<string>("all")
    const [urgencyFilter, setUrgencyFilter] = useState<string>("all")
    const [deviceStatusFilter, setDeviceStatusFilter] = useState<string>("all")
    const [locationFilter, setLocationFilter] = useState<string>("all")
    const [sortField, setSortField] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)

    const uniqueTechnicians = useMemo(() => {
        return technicians.map((tech) => ({ id: tech.id, full_name: `${tech.first_name} ${tech.last_name}`.trim() }))
    }, [technicians])

    const uniqueUrgencies = useMemo(() => [...new Set(tasks.map((task) => task?.urgency || "").filter((urgency) => urgency))], [tasks])
    const uniqueDeviceStatuses = useMemo(() => [...new Set(tasks.map((task) => task?.workshop_status || "").filter((status) => status))], [tasks])
    const uniqueLocations = useMemo(() => [...new Set(tasks.map((task) => task?.current_location || "").filter((location) => location))], [tasks])

    const filteredAndSortedTasks = useMemo(() => {
        const filtered = tasks.filter((task) => {
            // Client-side search only applies if NOT using server-side search
            let matchesSearch = true;
            if (!isServerSideSearch) {
                matchesSearch =
                    internalSearchQuery === "" ||
                    task.title.toString().toLowerCase().includes(internalSearchQuery.toLowerCase()) ||
                    (task.customer_details?.name && task.customer_details.name.toLowerCase().includes(internalSearchQuery.toLowerCase())) ||
                    (task.customer_details?.phone_numbers && task.customer_details.phone_numbers.some((p: any) => p.phone_number.toLowerCase().includes(internalSearchQuery.toLowerCase()))) ||
                    (task.laptop_model_details?.name && task.laptop_model_details.name.toLowerCase().includes(internalSearchQuery.toLowerCase())) ||
                    task.description.toLowerCase().includes(internalSearchQuery.toLowerCase());
            }

            const matchesTaskStatus = taskStatusFilter === "all" || task.status === taskStatusFilter
            const matchesTechnician = technicianFilter === "all" || task.assigned_to_details?.full_name === technicianFilter
            const matchesUrgency = urgencyFilter === "all" || task.urgency === urgencyFilter
            const matchesDeviceStatus = deviceStatusFilter === "all" || task.workshop_status === deviceStatusFilter
            const matchesLocation = locationFilter === "all" || task.current_location === locationFilter

            return matchesSearch && matchesTaskStatus && matchesTechnician && matchesUrgency && matchesDeviceStatus && matchesLocation
        })

        if (sortField && sortDirection) {
            filtered.sort((a, b) => {
                const getField = (obj: any, path: string) => {
                    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
                }

                const aValue = getField(a, sortField)
                const bValue = getField(b, sortField)

                if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
                if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
                return 0
            })
        }

        return filtered
    }, [internalSearchQuery, isServerSideSearch, taskStatusFilter, technicianFilter, urgencyFilter, deviceStatusFilter, locationFilter, sortField, sortDirection, tasks])

    const handleSort = (field: string) => {
        if (sortField === field) {
            if (sortDirection === "asc") {
                setSortDirection("desc")
            } else if (sortDirection === "desc") {
                setSortField(null)
                setSortDirection(null)
            } else {
                setSortDirection("asc")
            }
        } else {
            setSortField(field)
            setSortDirection("asc")
        }
    }

    const clearAllFilters = () => {
        setInternalSearchQuery("") // This triggers the debounced update to parent
        setTaskStatusFilter("all")
        setTechnicianFilter("all")
        setUrgencyFilter("all")
        setDeviceStatusFilter("all")
        setSortField(null)
        setSortDirection(null)
    }

    return {
        searchQuery: internalSearchQuery, // Return internal state for UI
        setSearchQuery,
        taskStatusFilter, setTaskStatusFilter,
        technicianFilter, setTechnicianFilter,
        urgencyFilter, setUrgencyFilter,
        deviceStatusFilter, setDeviceStatusFilter,
        locationFilter, setLocationFilter,
        sortField,
        sortDirection,
        handleSort,
        clearAllFilters,
        filteredAndSortedTasks,
        uniqueTechnicians,
        uniqueUrgencies,
        uniqueDeviceStatuses,
        uniqueLocations
    }
}
