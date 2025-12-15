"use client"

import { useAuth } from "@/lib/auth-context"
import { SystemLogsPage } from "@/components/system/system-logs-page"

export default function AdminLogsPage() {
  const { user } = useAuth()

  if (user?.role !== "Administrator") {
    return null
  }

  return <SystemLogsPage />
}

