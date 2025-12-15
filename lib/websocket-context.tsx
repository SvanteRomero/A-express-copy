"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"

interface KPIData {
  totalActiveTasks: number
  revenueThisMonth: number
  tasksReadyForPickup: number
  averageRepairTime: string
}

interface TaskStatus {
  name: string
  value: number
  color: string
}

interface TechnicianWorkload {
  name: string
  tasks: number
}

interface Activity {
  id: number
  type: string
  message: string
  customer: string
  time: string
  icon: string
  color: string
}

interface WebSocketData {
  kpiData: KPIData
  taskStatuses: TaskStatus[]
  technicianWorkload: TechnicianWorkload[]
  recentActivities: Activity[]
  lastUpdated: Date
}

interface WebSocketContextType {
  data: WebSocketData | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  reconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider")
  }
  return context
}

// Mock WebSocket server simulation
class MockWebSocketServer {
  private callbacks: ((data: WebSocketData) => void)[] = []
  private interval: NodeJS.Timeout | null = null
  private activityCounter = 6

  private generateRandomData(): WebSocketData {
    const activities = [
      {
        type: "task_created",
        message: "New repair task created",
        customers: ["John Doe", "Sarah Wilson", "Mike Johnson"],
        icon: "Plus",
        color: "text-green-600",
      },
      {
        type: "payment_received",
        message: "Payment received",
        customers: ["Lisa Brown", "David Chen", "Emma Davis"],
        icon: "CreditCard",
        color: "text-blue-600",
      },
      {
        type: "task_completed",
        message: "Repair task completed",
        customers: ["Alex Smith", "Maria Garcia", "Tom Wilson"],
        icon: "CheckCircle",
        color: "text-green-600",
      },
      {
        type: "parts_needed",
        message: "Parts required",
        customers: ["Jane Doe", "Bob Johnson", "Carol White"],
        icon: "AlertTriangle",
        color: "text-orange-600",
      },
    ]

    return {
      kpiData: {
        totalActiveTasks: Math.floor(Math.random() * 10) + 45,
        revenueThisMonth: Math.floor(Math.random() * 2000) + 12000,
        tasksReadyForPickup: Math.floor(Math.random() * 5) + 6,
        averageRepairTime: `${(Math.random() * 2 + 2.5).toFixed(1)} days`,
      },
      taskStatuses: [
        { name: "In Progress", value: Math.floor(Math.random() * 5) + 20, color: "#dc2626" },
        { name: "Ready for Pickup", value: Math.floor(Math.random() * 3) + 7, color: "#f97316" },
        { name: "Awaiting Parts", value: Math.floor(Math.random() * 4) + 10, color: "#eab308" },
        { name: "Completed", value: Math.floor(Math.random() * 3) + 3, color: "#22c55e" },
      ],
      technicianWorkload: [
        { name: "John Smith", tasks: Math.floor(Math.random() * 4) + 6 },
        { name: "Sarah Johnson", tasks: Math.floor(Math.random() * 4) + 10 },
        { name: "Mike Chen", tasks: Math.floor(Math.random() * 3) + 5 },
        { name: "Lisa Brown", tasks: Math.floor(Math.random() * 4) + 7 },
        { name: "David Wilson", tasks: Math.floor(Math.random() * 3) + 6 },
      ],
      recentActivities: [
        {
          id: this.activityCounter++,
          type: activities[Math.floor(Math.random() * activities.length)].type,
          message: activities[Math.floor(Math.random() * activities.length)].message,
          customer: activities[Math.floor(Math.random() * activities.length)].customers[Math.floor(Math.random() * 3)],
          time: "Just now",
          icon: activities[Math.floor(Math.random() * activities.length)].icon,
          color: activities[Math.floor(Math.random() * activities.length)].color,
        },
      ],
      lastUpdated: new Date(),
    }
  }

  connect(callback: (data: WebSocketData) => void) {
    this.callbacks.push(callback)

    // Send initial data
    callback(this.generateRandomData())

    // Start sending updates every 5 seconds
    if (!this.interval) {
      this.interval = setInterval(() => {
        const data = this.generateRandomData()
        this.callbacks.forEach((cb) => cb(data))
      }, 5000)
    }
  }

  disconnect(callback: (data: WebSocketData) => void) {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback)
    if (this.callbacks.length === 0 && this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}

const mockServer = new MockWebSocketServer()

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<WebSocketData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use ref to store the callback for cleanup
  const callbackRef = useRef<((data: WebSocketData) => void) | null>(null)

  const handleData = useCallback((newData: WebSocketData) => {
    setData((prevData) => {
      if (prevData) {
        // Merge new activities with existing ones, keeping only the latest 5
        const allActivities = [...newData.recentActivities, ...prevData.recentActivities]
        const uniqueActivities = allActivities
          .filter((activity, index, self) => index === self.findIndex((a) => a.id === activity.id))
          .slice(0, 5)

        return {
          ...newData,
          recentActivities: uniqueActivities,
        }
      }
      return newData
    })
  }, [])

  const reconnect = useCallback(() => {
    // Disconnect existing
    if (callbackRef.current) {
      mockServer.disconnect(callbackRef.current)
    }
    setIsConnected(false)
    setData(null)

    // Reconnect after a delay
    setTimeout(() => {
      setIsConnecting(true)
      setError(null)
      callbackRef.current = handleData
      mockServer.connect(handleData)
      setIsConnected(true)
      setIsConnecting(false)
    }, 1000)
  }, [handleData])

  // Connect on mount, disconnect on unmount - empty deps to run once
  useEffect(() => {
    setIsConnecting(true)
    setError(null)

    // Simulate connection delay
    const timeoutId = setTimeout(() => {
      callbackRef.current = handleData
      mockServer.connect(handleData)
      setIsConnected(true)
      setIsConnecting(false)
    }, 1000)

    return () => {
      clearTimeout(timeoutId)
      if (callbackRef.current) {
        mockServer.disconnect(callbackRef.current)
      }
      setIsConnected(false)
    }
  }, [handleData])

  return (
    <WebSocketContext.Provider
      value={{
        data,
        isConnected,
        isConnecting,
        error,
        reconnect,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

