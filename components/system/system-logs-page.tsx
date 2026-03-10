"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Badge } from "@/components/ui/core/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { Alert, AlertDescription } from "@/components/ui/feedback/alert"
import {
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Shield,
  Database,
  Settings,
  User,
  CreditCard,
  FileText,
  Mail,
  Clock,
  Filter,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

// Mock system logs data
const systemLogs = [
  {
    id: "LOG-001",
    timestamp: "2024-01-16 14:30:25",
    level: "Error",
    category: "Authentication",
    user: "Unknown",
    action: "Failed login attempt",
    details: "Invalid credentials for user: admin@aplus.com",
    ipAddress: "192.168.1.45",
  },
  {
    id: "LOG-002",
    timestamp: "2024-01-16 14:28:12",
    level: "Info",
    category: "Task Management",
    user: "tech1",
    action: "Task status updated",
    details: "Task T-1025 marked as completed",
    ipAddress: "192.168.1.12",
  },
  {
    id: "LOG-003",
    timestamp: "2024-01-16 14:25:45",
    level: "Success",
    category: "Authentication",
    user: "manager",
    action: "User logged in",
    details: "Manager user successful authentication",
    ipAddress: "192.168.1.8",
  },
  {
    id: "LOG-004",
    timestamp: "2024-01-16 14:22:33",
    level: "Warning",
    category: "Database",
    user: "system",
    action: "Database backup",
    details: "Backup completed with warnings - 2 tables skipped",
    ipAddress: "localhost",
  },
  {
    id: "LOG-005",
    timestamp: "2024-01-16 14:20:18",
    level: "Info",
    category: "System",
    user: "admin",
    action: "Settings updated",
    details: "System configuration changed: notification_email_enabled",
    ipAddress: "192.168.1.1",
  },
  {
    id: "LOG-006",
    timestamp: "2024-01-16 14:18:55",
    level: "Error",
    category: "Database",
    user: "system",
    action: "Connection timeout",
    details: "Database connection timeout after 30 seconds",
    ipAddress: "localhost",
  },
  {
    id: "LOG-007",
    timestamp: "2024-01-16 14:15:22",
    level: "Info",
    category: "User Management",
    user: "admin",
    action: "User created",
    details: "New technician account created: tech3@aplus.com",
    ipAddress: "192.168.1.1",
  },
  {
    id: "LOG-008",
    timestamp: "2024-01-16 14:12:10",
    level: "Success",
    category: "Payment",
    user: "frontdesk1",
    action: "Payment processed",
    details: "Payment of $299.99 processed for task T-1020",
    ipAddress: "192.168.1.15",
  },
  {
    id: "LOG-009",
    timestamp: "2024-01-16 14:08:45",
    level: "Warning",
    category: "Email",
    user: "system",
    action: "Email delivery failed",
    details: "Failed to send notification to customer@email.com",
    ipAddress: "localhost",
  },
  {
    id: "LOG-010",
    timestamp: "2024-01-16 14:05:33",
    level: "Info",
    category: "Reports",
    user: "manager",
    action: "Report generated",
    details: "Monthly revenue report generated successfully",
    ipAddress: "192.168.1.8",
  },
]

export function SystemLogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [sortColumn, setSortColumn] = useState("timestamp")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isLoading, setIsLoading] = useState(false)

  // Filter and sort logs
  const filteredAndSortedLogs = useMemo(() => {
    let filtered = systemLogs

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.ipAddress.includes(searchQuery) ||
          log.id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Apply level filter
    if (levelFilter !== "all") {
      filtered = filtered.filter((log) => log.level === levelFilter)
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((log) => log.category === categoryFilter)
    }

    // Apply date range filter
    if (startDate && endDate) {
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.timestamp).toISOString().split("T")[0]
        return logDate >= startDate && logDate <= endDate
      })
    }

    // Sort logs
    return filtered.sort((a, b) => {
      let aValue = a[sortColumn as keyof typeof a]
      let bValue = b[sortColumn as keyof typeof b]

      if (sortColumn === "timestamp") {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }, [searchQuery, levelFilter, categoryFilter, startDate, endDate, sortColumn, sortDirection])

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = systemLogs.length
    const errors = systemLogs.filter((log) => log.level === "Error").length
    const warnings = systemLogs.filter((log) => log.level === "Warning").length
    const today = new Date().toISOString().split("T")[0]
    const todayLogs = systemLogs.filter((log) => log.timestamp.startsWith(today)).length

    return { total, errors, warnings, todayLogs }
  }, [])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  const handleExport = () => {
    const csvContent = [
      ["Timestamp", "Level", "Category", "User", "Action", "Details", "IP Address"].join(","),
      ...filteredAndSortedLogs.map((log) =>
        [log.timestamp, log.level, log.category, log.user, log.action, log.details, log.ipAddress]
          .map((field) => `"${field}"`)
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `system-logs-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setLevelFilter("all")
    setCategoryFilter("all")
    setStartDate("")
    setEndDate("")
  }

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "Error":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "Warning":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case "Success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "Info":
        return <Info className="h-4 w-4 text-blue-600" />
      default:
        return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Authentication":
        return <Shield className="h-4 w-4 text-blue-600" />
      case "Database":
        return <Database className="h-4 w-4 text-purple-600" />
      case "System":
        return <Settings className="h-4 w-4 text-gray-600" />
      case "User Management":
        return <User className="h-4 w-4 text-orange-600" />
      case "Task Management":
        return <FileText className="h-4 w-4 text-green-600" />
      case "Payment":
        return <CreditCard className="h-4 w-4 text-blue-600" />
      case "Email":
        return <Mail className="h-4 w-4 text-red-600" />
      case "Reports":
        return <FileText className="h-4 w-4 text-indigo-600" />
      default:
        return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "Error":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Error</Badge>
      case "Warning":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Warning</Badge>
      case "Success":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Success</Badge>
      case "Info":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Info</Badge>
      default:
        return <Badge variant="secondary">{level}</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">System Logs</h1>
        <p className="text-gray-600 mt-2">Monitor system activity and track important events</p>
      </div>

      {/* System Status Alert */}
      {statistics.errors > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>System Alert:</strong> {statistics.errors} error(s) detected in recent logs. Please review
            immediately.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Error Logs</p>
                <p className="text-2xl font-bold text-red-600">{statistics.errors}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Warning Logs</p>
                <p className="text-2xl font-bold text-orange-600">{statistics.warnings}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Logs</p>
                <p className="text-2xl font-bold text-green-600">{statistics.todayLogs}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search logs by action, details, user, category, IP address, or log ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base border-gray-300 focus:border-red-500 focus:ring-red-500"
            />
          </div>

          {/* Filter Controls */}
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <label htmlFor="log-date-from" className="text-sm font-medium text-gray-700">Date From</label>
              <Input
                id="log-date-from"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 border-gray-300 focus:border-red-500 focus:ring-red-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="log-date-to" className="text-sm font-medium text-gray-700">Date To</label>
              <Input
                id="log-date-to"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 border-gray-300 focus:border-red-500 focus:ring-red-500"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Log Level</p>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="h-10 border-gray-300 focus:border-red-500 focus:ring-red-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Error">Error</SelectItem>
                  <SelectItem value="Warning">Warning</SelectItem>
                  <SelectItem value="Success">Success</SelectItem>
                  <SelectItem value="Info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Category</p>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 border-gray-300 focus:border-red-500 focus:ring-red-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Authentication">Authentication</SelectItem>
                  <SelectItem value="Database">Database</SelectItem>
                  <SelectItem value="System">System</SelectItem>
                  <SelectItem value="User Management">User Management</SelectItem>
                  <SelectItem value="Task Management">Task Management</SelectItem>
                  <SelectItem value="Payment">Payment</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Reports">Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Actions</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex-1 h-10 border-gray-300 text-gray-600 hover:bg-gray-50 bg-transparent"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              Showing {filteredAndSortedLogs.length} of {systemLogs.length} logs
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
                className="border-gray-300 text-gray-600 hover:bg-gray-50 bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Refreshing..." : "Refresh"}
              </Button>
              <Button onClick={handleExport} className="bg-red-600 hover:bg-red-700 text-white">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            System Activity Logs
          </CardTitle>
          <CardDescription>Real-time system activity monitoring with detailed event tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto" style={{ maxHeight: "600px", overflowY: "auto" }}>
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("timestamp")}>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Timestamp
                      {getSortIcon("timestamp")}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("level")}>
                    <div className="flex items-center gap-2">
                      Level
                      {getSortIcon("level")}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("category")}>
                    <div className="flex items-center gap-2">
                      Category
                      {getSortIcon("category")}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("user")}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      User
                      {getSortIcon("user")}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("action")}>
                    <div className="flex items-center gap-2">
                      Action
                      {getSortIcon("action")}
                    </div>
                  </TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm text-gray-600">{log.timestamp}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getLevelIcon(log.level)}
                        {getLevelBadge(log.level)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(log.category)}
                        <span className="text-sm text-gray-700">{log.category}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{log.user}</TableCell>
                    <TableCell className="font-medium text-gray-900">{log.action}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm text-gray-600 truncate" title={log.details}>
                        {log.details}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">IP: {log.ipAddress}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredAndSortedLogs.length === 0 && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
                <p className="text-gray-600">
                  {searchQuery || levelFilter !== "all" || categoryFilter !== "all" || startDate || endDate
                    ? "No logs match your current filters"
                    : "No system logs available"}
                </p>
                {(searchQuery || levelFilter !== "all" || categoryFilter !== "all" || startDate || endDate) && (
                  <Button
                    variant="outline"
                    className="mt-4 border-gray-300 text-gray-600 hover:bg-gray-50 bg-transparent"
                    onClick={clearFilters}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
