"use client"

import { Button } from "@/components/ui/core/button"
import { Bell, ArrowLeft, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export function NotificationSettingsPage() {
    const router = useRouter()

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header Section */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/dashboard/settings")}
                    className="text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <Bell className="h-8 w-8 text-red-600" />
                        Notification Settings
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Configure notification preferences for your repair shop
                    </p>
                </div>
            </div>

            {/* Redirect to Messaging Settings */}
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border border-gray-200 text-center space-y-4">
                <MessageSquare className="h-12 w-12 text-gray-400" />
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                        SMS settings have moved
                    </h2>
                    <p className="text-sm text-gray-600 max-w-md">
                        All SMS notification settings — including task registration, pickup reminders,
                        and debt reminders — are now managed in Messaging Settings.
                    </p>
                </div>
                <Link href="/dashboard/settings/messaging">
                    <Button className="bg-red-600 hover:bg-red-700 text-white">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Go to Messaging Settings
                    </Button>
                </Link>
            </div>
        </div>
    )
}
