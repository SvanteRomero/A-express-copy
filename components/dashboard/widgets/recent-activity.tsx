import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Clock, Plus, CreditCard, CheckCircle, AlertTriangle } from "lucide-react"
import { useWebSocket } from "@/lib/websocket-context"

const iconMap = {
  Plus,
  CreditCard,
  CheckCircle,
  AlertTriangle,
}

export function RecentActivity() {
  const { data, isConnected } = useWebSocket()

  const activities = data?.recentActivities || []

  return (
    <Card className={`border-gray-200 transition-all duration-300 ${isConnected ? "" : "opacity-60"}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-gray-900">Recent System Activity</CardTitle>
            <CardDescription className="text-gray-600">Latest updates and alerts from your repair shop</CardDescription>
          </div>
          {isConnected && <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          ) : (
            activities.map((activity) => {
              const IconComponent = iconMap[activity.icon as keyof typeof iconMap] || Clock
              return (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 animate-in slide-in-from-top-2"
                >
                  <div className={`p-2 rounded-full bg-gray-100 ${activity.color}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                    <p className="text-sm text-gray-600">Customer: {activity.customer}</p>
                    <div className="flex items-center mt-1 space-x-2">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
