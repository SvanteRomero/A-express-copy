"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Switch } from "@/components/ui/core/switch"
import { Label } from "@/components/ui/core/label"
import {
    Bell,
    ArrowLeft,
    Volume2,
    VolumeX,
    Eye,
    EyeOff,
    RotateCcw,
    ClipboardList,
    CheckCircle,
    Wrench,
    Wallet,
    ShieldCheck,
    Clock,
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
    useNotificationPreferences,
    NOTIFICATION_CATEGORIES,
    type NotificationCategory,
} from "@/components/provider/notification-preferences"

const CATEGORY_ICONS: Record<NotificationCategory, React.ElementType> = {
    task: ClipboardList,
    approval: CheckCircle,
    workshop: Wrench,
    financial: Wallet,
    requests: ShieldCheck,
    scheduler: Clock,
}

const CATEGORY_COLORS: Record<NotificationCategory, string> = {
    task: 'text-blue-600',
    approval: 'text-green-600',
    workshop: 'text-indigo-600',
    financial: 'text-emerald-600',
    requests: 'text-amber-600',
    scheduler: 'text-purple-600',
}

export function NotificationSettingsPage() {
    const router = useRouter()
    const { preferences, updateCategoryPreference, resetToDefaults } = useNotificationPreferences()

    const categories = Object.entries(NOTIFICATION_CATEGORIES) as [
        NotificationCategory,
        typeof NOTIFICATION_CATEGORIES[NotificationCategory]
    ][]

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
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
                            Control which toast notifications appear and which ones play sound
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={resetToDefaults}
                    className="text-gray-600 hover:text-gray-900"
                >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                </Button>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    These preferences are saved to your browser and take effect immediately.
                    They control real-time toast notifications from WebSocket events across the app.
                </p>
            </div>

            {/* Notification Categories */}
            <Card className="border-gray-200">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                        <Bell className="h-6 w-6 text-red-600" />
                        Notification Categories
                    </CardTitle>
                    <CardDescription>
                        Toggle visibility and sound per category. Disabled categories will
                        silently skip incoming notifications.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Column Headers */}
                    <div className="flex items-center justify-end gap-6 pb-3 mb-3 border-b border-gray-200 pr-2">
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-600 w-16 justify-center">
                            <Eye className="h-4 w-4" />
                            Show
                        </div>
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-600 w-16 justify-center">
                            <Volume2 className="h-4 w-4" />
                            Sound
                        </div>
                    </div>

                    <div className="space-y-2">
                        {categories.map(([category, config]) => {
                            const Icon = CATEGORY_ICONS[category]
                            const colorClass = CATEGORY_COLORS[category]
                            const pref = preferences[category]

                            return (
                                <div
                                    key={category}
                                    className={`flex items-center justify-between p-4 rounded-lg transition-colors ${pref.enabled ? 'bg-gray-50' : 'bg-gray-100 opacity-75'
                                        }`}
                                >
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <Icon className={`h-5 w-5 mt-0.5 ${colorClass}`} />
                                        <div className="min-w-0">
                                            <Label className="text-base font-medium text-gray-900">
                                                {config.label}
                                            </Label>
                                            <p className="text-sm text-gray-600 mt-0.5">
                                                {config.description}
                                            </p>
                                            {category === 'requests' && !pref.enabled && (
                                                <p className="text-xs text-amber-600 mt-1 font-medium">
                                                    ⚠️ Disabling this hides interactive approval toasts
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 ml-4">
                                        <div className="flex items-center justify-center w-16">
                                            <Switch
                                                checked={pref.enabled}
                                                onCheckedChange={(val) =>
                                                    updateCategoryPreference(category, 'enabled', val)
                                                }
                                            />
                                        </div>
                                        <div className="flex items-center justify-center w-16">
                                            {pref.enabled ? (
                                                <Switch
                                                    checked={pref.sound}
                                                    onCheckedChange={(val) =>
                                                        updateCategoryPreference(category, 'sound', val)
                                                    }
                                                />
                                            ) : (
                                                <VolumeX className="h-4 w-4 text-gray-400" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    <span>Show = display toast popup</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Sound = play notification.wav</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>Disabled = notifications silently skipped</span>
                </div>
            </div>
        </div>
    )
}
