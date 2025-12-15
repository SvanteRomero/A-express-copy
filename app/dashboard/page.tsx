"use client"

import { useAuth } from "@/lib/auth-context"
import { AdminDashboard } from "@/components/dashboard/overviews/admin-dashboard"
import { ManagerDashboard } from "@/components/dashboard/overviews/manager-dashboard"
import { TechnicianDashboard } from "@/components/dashboard/overviews/technician-dashboard"
import { FrontDeskDashboard } from "@/components/dashboard/overviews/front-desk-dashboard"
import AccountantDashboard from "@/components/dashboard/overviews/accountant-dashboard"

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  switch (user.role) {
    case "Administrator":
      return <AdminDashboard />
    case "Manager":
      return <ManagerDashboard />
    case "Technician":
      return <TechnicianDashboard />
    case "Front Desk":
      return <FrontDeskDashboard />
    case "Accountant":
      return <AccountantDashboard />
    default:
      return <div>Unknown role</div>
  }
}
