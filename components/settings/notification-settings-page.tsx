"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Switch } from "@/components/ui/core/switch"
import { Label } from "@/components/ui/core/label"
import { Input } from "@/components/ui/core/input"
import { Bell, MessageSquare, Save, ArrowLeft, Loader2, Clock } from "lucide-react"
import { getSystemSettings, updateSystemSettings } from "@/lib/api-client"
import {
    showSettingsSavedToast,
    showSettingsLoadErrorToast,
    showSettingsSaveErrorToast,
} from "@/components/notifications/toast"
import { useRouter } from "next/navigation"

export function NotificationSettingsPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [autoSmsOnTaskCreation, setAutoSmsOnTaskCreation] = useState(true)
    const [autoPickupRemindersEnabled, setAutoPickupRemindersEnabled] = useState(false)
    const [pickupReminderHours, setPickupReminderHours] = useState(24)
    const [lastUpdated, setLastUpdated] = useState<string | null>(null)

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await getSystemSettings()
                setAutoSmsOnTaskCreation(settings.auto_sms_on_task_creation)
                setAutoPickupRemindersEnabled(settings.auto_pickup_reminders_enabled)
                setPickupReminderHours(settings.pickup_reminder_hours)
                setLastUpdated(settings.updated_at)
            } catch (error) {
                console.error("Failed to fetch settings:", error)
                showSettingsLoadErrorToast()
            } finally {
                setIsLoading(false)
            }
        }
        fetchSettings()
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const updated = await updateSystemSettings({
                auto_sms_on_task_creation: autoSmsOnTaskCreation,
                auto_pickup_reminders_enabled: autoPickupRemindersEnabled,
                pickup_reminder_hours: pickupReminderHours,
            })
            setLastUpdated(updated.updated_at)
            showSettingsSavedToast()
        } catch (error) {
            console.error("Failed to save settings:", error)
            showSettingsSaveErrorToast()
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
        )
    }

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
                            Configure SMS and notification preferences for your repair shop
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white">
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Settings
                </Button>
            </div>

            {/* SMS Settings Card */}
            <Card className="border-gray-200">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                        <MessageSquare className="h-6 w-6 text-blue-600" />
                        SMS Notifications
                    </CardTitle>
                    <CardDescription>
                        Configure automated SMS messages sent to customers
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Auto SMS on Task Creation */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="space-y-1">
                            <Label className="text-base font-medium text-gray-900">
                                Auto SMS on Task Registration
                            </Label>
                            <p className="text-sm text-gray-600">
                                Automatically send an SMS to customers when a new task is created,
                                notifying them that their device has been received and registered.
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Message includes: Customer name, device info, registration date, job number,
                                and pickup instructions.
                            </p>
                        </div>
                        <Switch
                            checked={autoSmsOnTaskCreation}
                            onCheckedChange={setAutoSmsOnTaskCreation}
                        />
                    </div>

                    {/* Auto Pickup Reminders */}
                    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label className="text-base font-medium text-gray-900">
                                    Automatic Pickup Reminders
                                </Label>
                                <p className="text-sm text-gray-600">
                                    Automatically send reminder SMS to customers whose tasks are ready
                                    for pickup but haven&apos;t been collected yet.
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Reminds customers of the 7-day pickup deadline and storage fees.
                                </p>
                            </div>
                            <Switch
                                checked={autoPickupRemindersEnabled}
                                onCheckedChange={setAutoPickupRemindersEnabled}
                            />
                        </div>

                        {autoPickupRemindersEnabled && (
                            <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                                <Clock className="h-5 w-5 text-gray-500" />
                                <Label className="text-sm text-gray-700">
                                    Send reminder every
                                </Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={168}
                                    value={pickupReminderHours}
                                    onChange={(e) => setPickupReminderHours(parseInt(e.target.value) || 24)}
                                    className="w-20 text-center"
                                />
                                <span className="text-sm text-gray-700">hours</span>
                            </div>
                        )}
                    </div>

                    {lastUpdated && (
                        <p className="text-xs text-gray-500">
                            Last updated: {new Date(lastUpdated).toLocaleString()}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
