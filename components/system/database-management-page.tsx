"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Badge } from "@/components/ui/core/badge"
import { Alert, AlertDescription } from "@/components/ui/feedback/alert"
import { Separator } from "@/components/ui/core/separator"
import {
  Database,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  HardDrive,
  Activity,
  Download,
  Search,
} from "lucide-react"

export function DatabaseManagementPage() {
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [lastBackup, setLastBackup] = useState({
    date: "January 15, 2024 at 2:30 PM",
    status: "completed",
    size: "2.3 GB",
  })
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false)
  const [integrityResults, setIntegrityResults] = useState({
    lastCheck: "January 15, 2024 at 1:45 PM",
    tablesChecked: 47,
    issuesFound: 0,
    status: "healthy",
    details: [
      "All table structures are valid",
      "No orphaned records detected",
      "All foreign key constraints are intact",
      "Index integrity verified",
    ],
  })

  const handleBackup = async () => {
    setIsBackingUp(true)

    // Simulate backup process
    await new Promise((resolve) => setTimeout(resolve, 3000))

    setLastBackup({
      date: new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      status: "completed",
      size: "2.4 GB",
    })

    setIsBackingUp(false)
  }

  const handleIntegrityCheck = async () => {
    setIsCheckingIntegrity(true)

    // Simulate integrity check process
    await new Promise((resolve) => setTimeout(resolve, 2500))

    setIntegrityResults({
      lastCheck: new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      tablesChecked: 47,
      issuesFound: 0,
      status: "healthy",
      details: [
        "All table structures are valid",
        "No orphaned records detected",
        "All foreign key constraints are intact",
        "Index integrity verified",
        "Database optimization completed",
      ],
    })

    setIsCheckingIntegrity(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <Database className="h-8 w-8 text-red-600" />
            Database Management
          </h1>
          <p className="text-gray-600 mt-2">Secure database operations including backups and integrity monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-600">System Secure</span>
        </div>
      </div>

      {/* Database Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Database Status</p>
                <p className="text-lg font-bold text-green-600">Operational</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <HardDrive className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Database Size</p>
                <p className="text-lg font-bold text-gray-900">2.4 GB</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Connections</p>
                <p className="text-lg font-bold text-gray-900">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Backup Section */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
            <Download className="h-6 w-6 text-red-600" />
            Database Backup
          </CardTitle>
          <CardDescription>
            Create a complete backup of the A+ Express database. This includes all customer data, repair records, user
            accounts, and system settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Button
              onClick={handleBackup}
              disabled={isBackingUp}
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg font-semibold min-w-[200px]"
            >
              {isBackingUp ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Backing Up...
                </div>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Backup Database
                </>
              )}
            </Button>

            <Separator className="w-full" />

            <div className="w-full bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Last Backup Status</span>
                {getStatusBadge(lastBackup.status)}
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Last backup: {lastBackup.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  <span>Backup size: {lastBackup.size}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Integrity Section */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
            <Search className="h-6 w-6 text-blue-600" />
            Data Integrity Check
          </CardTitle>
          <CardDescription>
            Perform a comprehensive check of database integrity, including table structures, relationships, and data
            consistency validation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Button
              onClick={handleIntegrityCheck}
              disabled={isCheckingIntegrity}
              variant="outline"
              size="lg"
              className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-4 text-lg font-semibold min-w-[200px] bg-transparent"
            >
              {isCheckingIntegrity ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  Checking...
                </div>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Run Data Integrity Check
                </>
              )}
            </Button>

            <Separator className="w-full" />

            <div className="w-full">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Last Integrity Check</span>
                  <div className="flex items-center gap-2">
                    {integrityResults.status === "healthy" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    <Badge
                      className={
                        integrityResults.status === "healthy"
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                      }
                    >
                      {integrityResults.status === "healthy" ? "Healthy" : "Issues Found"}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-2 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Last check: {integrityResults.lastCheck}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>Tables checked: {integrityResults.tablesChecked}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {integrityResults.issuesFound === 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span>Issues found: {integrityResults.issuesFound}</span>
                  </div>
                </div>
              </div>

              {integrityResults.status === "healthy" ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Database Integrity: Excellent</strong>
                    <div className="mt-2 space-y-1">
                      {integrityResults.details.map((detail) => (
                        <div key={detail} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <strong>Issues Detected:</strong> {integrityResults.issuesFound} inconsistencies found.
                    <div className="mt-2 space-y-1">
                      {integrityResults.details.map((detail) => (
                        <div key={detail} className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-3 w-3 text-yellow-600" />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
