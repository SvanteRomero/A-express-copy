"use client"

import { useAuth } from "@/hooks/use-auth"
import { SettingsOverview } from "@/components/settings/settings-overview"

export default function AdminSettings() {
  const { user } = useAuth()

  if (user?.role !== "Administrator") {
    return null
  }

  return <SettingsOverview />
}

