"use client"

import { useAuth } from "@/lib/auth-context"
import { ReportsOverview } from "@/components/reports/reports-overview"

export default function ReportsPage() {
  const { user } = useAuth()

  // Check if user has access to reports (Admin or Manager roles)
  const hasReportsAccess = user?.role === "Administrator" || user?.role === "Manager" || user?.role === "Accountant"

  if (!hasReportsAccess) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access reports.</p>
        </div>
      </div>
    )
  }

  return <ReportsOverview />
}
