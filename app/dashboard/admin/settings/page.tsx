"use client"

import { useAuth } from "@/hooks/use-auth"
import { AdminSettingsPage } from "@/components/settings/admin-settings-page"

export default function AdminSettings() {
  const { user } = useAuth()

  if (user?.role !== "Administrator") {
    return null
  }

  return <AdminSettingsPage />
}

