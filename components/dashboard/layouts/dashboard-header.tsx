"use client"

import { SidebarTrigger } from "@/components/ui/layout/sidebar"
import { Separator } from "@/components/ui/core/separator"
import { useAuth } from "@/hooks/use-auth"
import { useWebSocketContext } from "@/components/provider/websocket-provider"
import { Wifi, WifiOff } from "lucide-react"

export function DashboardHeader() {
  const { user } = useAuth()
  const { isConnected } = useWebSocketContext()

  // Show indicator for all authenticated users
  const showWsIndicator = !!user

  return (
    <header className="flex h-14 sm:h-16 shrink-0 items-center gap-1.5 sm:gap-2 border-b px-3 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4" />
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <h1 className="text-sm sm:text-lg font-semibold truncate">
          <span className="sm:hidden">A Express</span>
          <span className="hidden sm:inline">A Express Dashboard</span>
        </h1>
        {user && <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">- {user.role}</span>}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* WebSocket Connection Indicator */}
      {showWsIndicator && (
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300"
          title={isConnected ? "Real-time updates active" : "Connecting to real-time updates..."}
        >
          {isConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <Wifi className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-600 dark:text-green-400 hidden sm:inline">Live</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <WifiOff className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-amber-600 dark:text-amber-400 hidden sm:inline">Connecting</span>
            </>
          )}
        </div>
      )}
    </header>
  )
}
