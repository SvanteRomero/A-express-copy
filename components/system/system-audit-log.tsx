"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Label } from "@/components/ui/core/label"
import { Badge } from "@/components/ui/core/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import {
  Shield,
  Download,
  Filter,
  User,
  Activity,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings,
  CreditCard,
  UserPlus,
  FileText,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

// Mock audit log data
interface AuditLogEntry {
  id: string
  timestamp: string
  user: string
  userRole: string
  action: string
  actionType: string
  taskId?: string
  oldValue?: string
  newValue?: string
  ipAddress: string
  userAgent: string
  severity: "low" | "medium" | "high" | "critical"
}

const mockAuditLog: AuditLogEntry[] = [
  {
    id: "AL-001",
    timestamp: "2024-01-15 14:30:25",
    user: "Admin User",
    userRole: "Administrator",
    action: "Task Status Changed",
    actionType: "task_update",
    taskId: "T-1001",
    oldValue: "In Progress",
    newValue: "Ready for Pickup",
    ipAddress: "192.168.1.100",
    userAgent: "Chrome/120.0.0.0",
    severity: "low",
  },
  {
    id: "AL-002",
    timestamp: "2024-01-15 14:25:12",
    user: "Sarah Johnson",
    userRole: "Technician",
    action: "Payment Recorded",
    actionType: "payment",
    taskId: "T-1005",
    oldValue: "Unpaid",
    newValue: "Paid - $299.99",
    ipAddress: "192.168.1.105",
    userAgent: "Firefox/121.0.0.0",
    severity: "medium",
  },
  {
    id: "AL-003",
    timestamp: "2024-01-15 14:20:45",
    user: "Front Desk User",
    userRole: "Front Desk",
    action: "New Task Created",
    actionType: "task_create",
    taskId: "T-1025",
    oldValue: null,
    newValue: "Task Created - John Doe - MacBook Pro",
    ipAddress: "192.168.1.102",
    userAgent: "Chrome/120.0.0.0",
    severity: "low",
  },
  {
    id: "AL-004",
    timestamp: "2024-01-15 14:15:33",
    user: "Admin User",
    userRole: "Administrator",
    action: "User Account Created",
    actionType: "user_management",
    taskId: null,
    oldValue: null,
    newValue: "New Technician Account - Mike Wilson",
    ipAddress: "192.168.1.100",
    userAgent: "Chrome/120.0.0.0",
    severity: "high",
  },
  {
    id: "AL-005",
    timestamp: "2024-01-15 14:10:18",
    user: "Shop Manager",
    userRole: "Manager",
    action: "System Settings Modified",
    actionType: "system_config",
    taskId: null,
    oldValue: "Auto-backup: Disabled",
    newValue: "Auto-backup: Enabled",
    ipAddress: "192.168.1.103",
    userAgent: "Safari/17.2.0",
    severity: "high",
  },
  {
    id: "AL-006",
    timestamp: "2024-01-15 13:55:42",
    user: "Lisa Brown",
    userRole: "Technician",
    action: "Task Assignment Changed",
    actionType: "task_update",
    taskId: "T-1020",
    oldValue: "Assigned to: John Smith",
    newValue: "Assigned to: Lisa Brown",
    ipAddress: "192.168.1.107",
    userAgent: "Chrome/120.0.0.0",
    severity: "low",
  },
  {
    id: "AL-007",
    timestamp: "2024-01-15 13:45:29",
    user: "Admin User",
    userRole: "Administrator",
    action: "Failed Login Attempt",
    actionType: "authentication",
    taskId: null,
    oldValue: null,
    newValue: "Failed login for user: unknown_user",
    ipAddress: "203.0.113.45",
    userAgent: "Unknown",
    severity: "critical",
  },
  {
    id: "AL-008",
    timestamp: "2024-01-15 13:40:15",
    user: "Mike Chen",
    userRole: "Technician",
    action: "Customer Information Updated",
    actionType: "customer_update",
    taskId: "T-1018",
    oldValue: "Phone: (555) 123-4567",
    newValue: "Phone: (555) 987-6543",
    ipAddress: "192.168.1.108",
    userAgent: "Chrome/120.0.0.0",
    severity: "low",
  },
  {
    id: "AL-009",
    timestamp: "2024-01-15 13:35:08",
    user: "Front Desk User",
    userRole: "Front Desk",
    action: "Task Deleted",
    actionType: "task_delete",
    taskId: "T-1015",
    oldValue: "Task Status: Cancelled",
    newValue: "Task Permanently Deleted",
    ipAddress: "192.168.1.102",
    userAgent: "Chrome/120.0.0.0",
    severity: "high",
  },
  {
    id: "AL-010",
    timestamp: "2024-01-15 13:30:52",
    user: "Shop Manager",
    userRole: "Manager",
    action: "Report Generated",
    actionType: "report",
    taskId: null,
    oldValue: null,
    newValue: "Revenue Summary Report - January 2024",
    ipAddress: "192.168.1.103",
    userAgent: "Safari/17.2.0",
    severity: "low",
  },
]

const actionTypes = [
  { value: "all", label: "All Actions" },
  { value: "task_create", label: "Task Creation" },
  { value: "task_update", label: "Task Updates" },
  { value: "task_delete", label: "Task Deletion" },
  { value: "payment", label: "Payments" },
  { value: "user_management", label: "User Management" },
  { value: "system_config", label: "System Configuration" },
  { value: "authentication", label: "Authentication" },
  { value: "customer_update", label: "Customer Updates" },
  { value: "report", label: "Reports" },
]

const users = [
  { value: "all", label: "All Users" },
  { value: "Admin User", label: "Admin User" },
  { value: "Shop Manager", label: "Shop Manager" },
  { value: "Sarah Johnson", label: "Sarah Johnson" },
  { value: "Lisa Brown", label: "Lisa Brown" },
  { value: "Mike Chen", label: "Mike Chen" },
  { value: "Front Desk User", label: "Front Desk User" },
]

const severityLevels = [
  { value: "all", label: "All Severity Levels" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]

type SortField = "timestamp" | "user" | "action" | "taskId"
type SortDirection = "asc" | "desc" | null

export function SystemAuditLog() {
  const [searchQuery, setSearchQuery] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedUser, setSelectedUser] = useState("all")
  const [selectedActionType, setSelectedActionType] = useState("all")
  const [selectedSeverity, setSelectedSeverity] = useState("all")
  const [sortField, setSortField] = useState<SortField>("timestamp")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [isExporting, setIsExporting] = useState(false)

  // Filter and sort audit log entries
  const filteredAndSortedEntries = useMemo(() => {
    const filtered = mockAuditLog.filter((entry) => {
      const matchesSearch =
        searchQuery === "" ||
        entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.taskId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.oldValue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.newValue?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesDateRange = (!startDate || entry.timestamp >= startDate) && (!endDate || entry.timestamp <= endDate)

      const matchesUser = selectedUser === "all" || entry.user === selectedUser
      const matchesActionType = selectedActionType === "all" || entry.actionType === selectedActionType
      const matchesSeverity = selectedSeverity === "all" || entry.severity === selectedSeverity

      return matchesSearch && matchesDateRange && matchesUser && matchesActionType && matchesSeverity
    })

    // Sort entries
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue: string | undefined
        let bValue: string | undefined

        switch (sortField) {
          case "timestamp":
            aValue = a.timestamp
            bValue = b.timestamp
            break
          case "user":
            aValue = a.user
            bValue = b.user
            break
          case "action":
            aValue = a.action
            bValue = b.action
            break
          case "taskId":
            aValue = a.taskId || ""
            bValue = b.taskId || ""
            break
        }

        if (!aValue || !bValue) return 0

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [searchQuery, startDate, endDate, selectedUser, selectedActionType, selectedSeverity, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortField("timestamp")
        setSortDirection("desc")
      } else {
        setSortDirection("asc")
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4" />
    if (sortDirection === "desc") return <ArrowDown className="h-4 w-4" />
    return <ArrowUpDown className="h-4 w-4" />
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Critical</Badge>
      case "high":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>
      case "low":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Low</Badge>
      default:
        return <Badge variant="secondary">{severity}</Badge>
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "task_create":
      case "task_update":
      case "task_delete":
        return <FileText className="h-4 w-4 text-blue-600" />
      case "payment":
        return <CreditCard className="h-4 w-4 text-green-600" />
      case "user_management":
        return <UserPlus className="h-4 w-4 text-purple-600" />
      case "system_config":
        return <Settings className="h-4 w-4 text-orange-600" />
      case "authentication":
        return <Shield className="h-4 w-4 text-red-600" />
      case "customer_update":
        return <User className="h-4 w-4 text-indigo-600" />
      case "report":
        return <FileText className="h-4 w-4 text-gray-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const exportToCSV = async () => {
    setIsExporting(true)

    try {
      // Prepare CSV data
      const headers = [
        "Timestamp",
        "User",
        "User Role",
        "Action",
        "Task ID",
        "Old Value",
        "New Value",
        "IP Address",
        "Severity",
      ]
      const csvData = [
        headers.join(","),
        ...filteredAndSortedEntries.map((entry) =>
          [
            `"${entry.timestamp}"`,
            `"${entry.user}"`,
            `"${entry.userRole}"`,
            `"${entry.action}"`,
            `"${entry.taskId || ""}"`,
            `"${entry.oldValue || ""}"`,
            `"${entry.newValue || ""}"`,
            `"${entry.ipAddress}"`,
            `"${entry.severity}"`,
          ].join(","),
        ),
      ].join("\n")

      // Create and download CSV file
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `audit_log_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error("Error exporting CSV:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const clearAllFilters = () => {
    setSearchQuery("")
    setStartDate("")
    setEndDate("")
    setSelectedUser("all")
    setSelectedActionType("all")
    setSelectedSeverity("all")
    setSortField("timestamp")
    setSortDirection("desc")
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-600" />
            System Audit Log
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive record of all system activities and user actions for security and compliance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={exportToCSV}
            disabled={isExporting || filteredAndSortedEntries.length === 0}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isExporting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Exporting...
              </div>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
          <Button variant="outline" onClick={clearAllFilters} className="border-gray-300 text-gray-700 bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Entries</p>
                <p className="text-xl font-bold text-gray-900">{filteredAndSortedEntries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Events</p>
                <p className="text-xl font-bold text-gray-900">
                  {filteredAndSortedEntries.filter((e) => e.severity === "critical").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Task Actions</p>
                <p className="text-xl font-bold text-gray-900">
                  {
                    filteredAndSortedEntries.filter((e) =>
                      ["task_create", "task_update", "task_delete"].includes(e.actionType),
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Last 24 Hours</p>
                <p className="text-xl font-bold text-gray-900">
                  {
                    filteredAndSortedEntries.filter((e) => {
                      const entryDate = new Date(e.timestamp)
                      const yesterday = new Date()
                      yesterday.setDate(yesterday.getDate() - 1)
                      return entryDate >= yesterday
                    }).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            Filters & Search
          </CardTitle>
          <CardDescription>Filter audit log entries by date range, user, action type, and severity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search actions, users, task IDs, or values..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base border-gray-300 focus:border-red-500 focus:ring-red-500"
            />
          </div>

          {/* Filter Controls */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
              />
            </div>
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.value} value={user.value}>
                      {user.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={selectedActionType} onValueChange={setSelectedActionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {severityLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearAllFilters}
                className="w-full border-gray-300 text-gray-600 bg-transparent"
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t">
            <span>
              Showing {filteredAndSortedEntries.length} of {mockAuditLog.length} entries
            </span>
            {(searchQuery ||
              startDate ||
              endDate ||
              selectedUser !== "all" ||
              selectedActionType !== "all" ||
              selectedSeverity !== "all") && <span className="text-red-600">Filters active</span>}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Audit Log Entries</CardTitle>
          <CardDescription>Chronological record of all system activities</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-900">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("timestamp")}
                      className="h-auto p-0 font-semibold text-gray-900 hover:text-red-600"
                    >
                      Timestamp {getSortIcon("timestamp")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("user")}
                      className="h-auto p-0 font-semibold text-gray-900 hover:text-red-600"
                    >
                      User {getSortIcon("user")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("action")}
                      className="h-auto p-0 font-semibold text-gray-900 hover:text-red-600"
                    >
                      Action Performed {getSortIcon("action")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("taskId")}
                      className="h-auto p-0 font-semibold text-gray-900 hover:text-red-600"
                    >
                      Task ID {getSortIcon("taskId")}
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">Old Value</TableHead>
                  <TableHead className="font-semibold text-gray-900">New Value</TableHead>
                  <TableHead className="font-semibold text-gray-900">Severity</TableHead>
                  <TableHead className="font-semibold text-gray-900">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm text-gray-900">{entry.timestamp}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{entry.user}</p>
                        <p className="text-sm text-gray-500">{entry.userRole}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(entry.actionType)}
                        <span className="text-gray-900">{entry.action}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.taskId ? (
                        <span className="font-medium text-red-600">{entry.taskId}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.oldValue ? (
                        <span className="text-sm text-gray-600 bg-red-50 px-2 py-1 rounded font-mono">
                          {entry.oldValue}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.newValue ? (
                        <span className="text-sm text-gray-600 bg-green-50 px-2 py-1 rounded font-mono">
                          {entry.newValue}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getSeverityBadge(entry.severity)}</TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">{entry.ipAddress}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredAndSortedEntries.length === 0 && (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No audit entries found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
