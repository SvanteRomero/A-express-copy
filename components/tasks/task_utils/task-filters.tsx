"use client"

import { Input } from "@/components/ui/core/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { Button } from "@/components/ui/core/button"
import { Search, Filter } from "lucide-react"

interface TaskFiltersProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  taskStatusFilter: string
  setTaskStatusFilter: (status: string) => void
  technicianFilter: string | number
  setTechnicianFilter: (technician: string | number) => void
  urgencyFilter: string
  setUrgencyFilter: (urgency: string) => void
  deviceStatusFilter?: string
  setDeviceStatusFilter?: (status: string) => void
  locationFilter?: string
  setLocationFilter?: (location: string) => void
  uniqueStatuses: string[]
  uniqueTechnicians: { id: number; full_name: string }[]
  uniqueUrgencies: string[]
  uniqueDeviceStatuses?: string[]
  uniqueLocations?: { id: number; name: string }[] | string[]
  clearAllFilters: () => void
  showDeviceStatusFilter?: boolean
  showLocationFilter?: boolean
  showTechnicianFilter?: boolean
}

export function TaskFilters({ searchQuery, setSearchQuery, taskStatusFilter, setTaskStatusFilter, technicianFilter, setTechnicianFilter, urgencyFilter, setUrgencyFilter, deviceStatusFilter, setDeviceStatusFilter, locationFilter, setLocationFilter, uniqueStatuses, uniqueTechnicians, uniqueUrgencies, uniqueDeviceStatuses, uniqueLocations, clearAllFilters, showDeviceStatusFilter = true, showLocationFilter = false, showTechnicianFilter = true }: TaskFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by Task ID, Customer Name, Laptop Model, or Issue..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-base border-gray-300 focus:border-red-500 focus:ring-red-500"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Task Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Task Statuses</SelectItem>
            {uniqueStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showTechnicianFilter && (
          <Select value={String(technicianFilter)} onValueChange={(val) => setTechnicianFilter(val === "all" ? "all" : Number(val))}>
            <SelectTrigger>
              <SelectValue placeholder="All Technicians" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {uniqueTechnicians.map((technician) => (
                <SelectItem key={technician.id} value={String(technician.id)}>
                  {technician.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Urgencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgencies</SelectItem>
            {uniqueUrgencies.map((urgency) => (
              <SelectItem key={urgency} value={urgency}>
                {urgency}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showDeviceStatusFilter && deviceStatusFilter && setDeviceStatusFilter && uniqueDeviceStatuses && (
          <Select value={deviceStatusFilter} onValueChange={setDeviceStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Device Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Device Statuses</SelectItem>
              {uniqueDeviceStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showLocationFilter && locationFilter && setLocationFilter && uniqueLocations && (
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueLocations.map((location) => {
                const locValue = typeof location === 'string' ? location : location.name;
                const locKey = typeof location === 'string' ? location : location.id;
                return (
                  <SelectItem key={locKey} value={locValue}>
                    {locValue}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )}

        <Button
          variant="outline"
          onClick={clearAllFilters}
          className="border-gray-300 text-gray-600 bg-transparent"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  )
}
