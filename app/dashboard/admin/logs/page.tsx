"use client"

import { useAuth } from "@/hooks/use-auth"
import { SystemLogsPage } from "@/components/system/system-logs-page"

export default function AdminLogsPage() {
  const { user } = useAuth()

  if (user?.role !== "Administrator") {
    return null
  }

  return <SystemLogsPage />
}

