"use client"

import { SidebarTrigger } from "@/components/ui/layout/sidebar"
import { Separator } from "@/components/ui/core/separator"
import { Button } from "@/components/ui/core/button"
import { useAuth } from "@/hooks/use-auth"
import { useWebSocketContext } from "@/components/provider/websocket-provider"
import { Wifi, WifiOff, AlertTriangle, RotateCcw } from "lucide-react"

export function DashboardHeader() {
  const { user } = useAuth()
  const { isConnected, connectionQuality, forceReconnect } = useWebSocketContext()

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
        <div className="flex items-center gap-2">
          {connectionQuality === 'degraded' ? (
            <>
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-yellow-50 dark:bg-yellow-950"
                title="Connection degraded - no recent messages received"
              >
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                </span>
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-yellow-600 dark:text-yellow-400 hidden sm:inline">Degraded</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 hidden sm:flex"
                onClick={forceReconnect}
                title="Force reconnection"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </>
          ) : !isConnected || connectionQuality === 'disconnected' ? (
            <>
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950"
                title="Disconnected from real-time updates"
              >
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <WifiOff className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400 hidden sm:inline">Offline</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 hidden sm:flex"
                onClick={forceReconnect}
                title="Reconnect"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300"
              title="Real-time updates active"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <Wifi className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-600 dark:text-green-400 hidden sm:inline">Live</span>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
