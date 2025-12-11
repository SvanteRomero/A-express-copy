"use client"

import { useAuth } from "@/lib/auth-context"
import { FrontDeskTasksPage } from "@/components/tasks/front-desk-tasks-page"

export default function FrontDeskTasksPageRoute() {
  const { user } = useAuth()

  // Check if user has front-desk access
  const hasFrontDeskAccess = user?.role === "Administrator" || user?.role === "Front Desk"

  if (!hasFrontDeskAccess) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the front-desk tasks section.</p>
        </div>
      </div>
    )
  }

  return <FrontDeskTasksPage />
}

