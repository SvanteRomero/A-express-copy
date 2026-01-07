"use client"

import { SidebarTrigger } from "@/components/ui/layout/sidebar"
import { Separator } from "@/components/ui/core/separator"
import { useAuth } from "@/hooks/use-auth"

export function DashboardHeader() {
  const { user } = useAuth()

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">A+ Express Dashboard</h1>
        {user && <span className="text-sm text-muted-foreground">- {user.role}</span>}
      </div>
    </header>
  )
}
