
import { useState, useMemo } from "react"

export interface TaskSorting {
    sortField: string | null
    sortDirection: "asc" | "desc" | null
}

export interface TaskFiltersState {
    searchQuery: string
    statusFilter: string
    technicianFilter: string
    urgencyFilter: string
    locationFilter: string
}

export function useTaskFiltering(tasks: any[], technicians: any[]) {
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [technicianFilter, setTechnicianFilter] = useState<string>("all")
    const [urgencyFilter, setUrgencyFilter] = useState<string>("all")
    const [locationFilter, setLocationFilter] = useState<string>("all")
    const [sortField, setSortField] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)

    const uniqueTechnicians = useMemo(() => {
        return technicians.map((tech) => ({ id: tech.id, full_name: `${tech.first_name} ${tech.last_name}`.trim() }))
    }, [technicians])

    const uniqueUrgencies = useMemo(() => [...new Set(tasks.map((task) => task?.urgency || "").filter((urgency) => urgency))], [tasks])
    const uniqueLocations = useMemo(() => [...new Set(tasks.map((task) => task?.current_location || "").filter((location) => location))], [tasks])

    const filteredAndSortedTasks = useMemo(() => {
        const filtered = tasks.filter((task) => {
            const matchesSearch =
                searchQuery === "" ||
                task.title.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.customer_details?.name && task.customer_details.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (task.customer_details?.phone_numbers && task.customer_details.phone_numbers.some((p: any) => p.phone_number.toLowerCase().includes(searchQuery.toLowerCase()))) ||
                (task.laptop_model_details?.name && task.laptop_model_details.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                task.description.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesStatus = statusFilter === "all" || task.status === statusFilter
            const matchesTechnician = technicianFilter === "all" || task.assigned_to_details?.full_name === technicianFilter
            const matchesUrgency = urgencyFilter === "all" || task.urgency === urgencyFilter
            const matchesLocation = locationFilter === "all" || task.current_location === locationFilter

            return matchesSearch && matchesStatus && matchesTechnician && matchesUrgency && matchesLocation
        })

        if (sortField && sortDirection) {
            filtered.sort((a, b) => {
                // Handle nested properties if necessary, though current usage suggests flat field access or pre-processed data might be needed.
                // The original code used direct access: aValue = a[sortField]
                // This assumes sortField corresponds to a key in the task object.
                // For 'customer_details.name', standard bracket access wouldn't work without splitting.
                // Let's implement safe getter.

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
    }, [searchQuery, statusFilter, technicianFilter, urgencyFilter, locationFilter, sortField, sortDirection, tasks])

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
        setSearchQuery("")
        setStatusFilter("all")
        setTechnicianFilter("all")
        setUrgencyFilter("all")
        setLocationFilter("all")
        setSortField(null)
        setSortDirection(null)
    }

    return {
        searchQuery, setSearchQuery,
        statusFilter, setStatusFilter,
        technicianFilter, setTechnicianFilter,
        urgencyFilter, setUrgencyFilter,
        locationFilter, setLocationFilter,
        sortField,
        sortDirection,
        handleSort,
        clearAllFilters,
        filteredAndSortedTasks,
        uniqueTechnicians,
        uniqueUrgencies,
        uniqueLocations
    }
}
