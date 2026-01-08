"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Switch } from "@/components/ui/core/switch"
import { Label } from "@/components/ui/core/label"
import { Bell, MessageSquare, Save, ArrowLeft, Loader2 } from "lucide-react"
import { getSystemSettings, updateSystemSettings } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function NotificationSettingsPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [autoSmsOnTaskCreation, setAutoSmsOnTaskCreation] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<string | null>(null)

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await getSystemSettings()
                setAutoSmsOnTaskCreation(settings.auto_sms_on_task_creation)
                setLastUpdated(settings.updated_at)
            } catch (error) {
                console.error("Failed to fetch settings:", error)
                toast({
                    title: "Error",
                    description: "Failed to load notification settings",
                    variant: "destructive",
                })
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
            })
            setLastUpdated(updated.updated_at)
            toast({
                title: "Settings Saved",
                description: "Notification settings have been updated successfully.",
                className: "bg-green-600 text-white border-green-600",
            })
        } catch (error) {
            console.error("Failed to save settings:", error)
            toast({
                title: "Error",
                description: "Failed to save notification settings",
                variant: "destructive",
            })
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
