"use client"

import { useWebSocketContext } from "@/components/provider/websocket-provider"
import { Badge } from "@/components/ui/core/badge"
import { Button } from "@/components/ui/core/button"
import { WifiOff, Wifi, AlertTriangle, RotateCcw } from "lucide-react"

export function ConnectionStatus() {
  const { isConnected, connectionQuality, forceReconnect } = useWebSocketContext()

  // Degraded: connected but no recent messages
  if (connectionQuality === 'degraded') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="flex items-center gap-2 bg-yellow-600 text-white">
          <AlertTriangle className="h-3 w-3" />
          Connection Degraded
        </Badge>
        <Button size="sm" variant="outline" onClick={forceReconnect}>
          <RotateCcw className="h-3 w-3 mr-1" />
          Reconnect
        </Button>
      </div>
    )
  }

  // Disconnected
  if (!isConnected || connectionQuality === 'disconnected') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="flex items-center gap-2">
          <WifiOff className="h-3 w-3" />
          Disconnected
        </Badge>
        <Button size="sm" variant="outline" onClick={forceReconnect}>
          <RotateCcw className="h-3 w-3 mr-1" />
          Reconnect
        </Button>
      </div>
    )
  }

  // Connected and healthy
  return (
    <Badge variant="default" className="flex items-center gap-2 bg-green-600">
      <Wifi className="h-3 w-3 animate-pulse" />
      Live
    </Badge>
  )
}
