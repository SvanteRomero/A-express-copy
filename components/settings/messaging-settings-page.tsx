"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Switch } from "@/components/ui/core/switch"
import { Label } from "@/components/ui/core/label"
import { Input } from "@/components/ui/core/input"
import {
    MessageSquare,
    Save,
    ArrowLeft,
    Loader2,
    Send,
    Clock,
    Wallet,
    Calendar,
} from "lucide-react"
import { getSystemSettings, updateSystemSettings } from "@/lib/api-client"
import {
    showSettingsSavedToast,
    showSettingsLoadErrorToast,
    showSettingsSaveErrorToast,
} from "@/components/notifications/toast"
import { useRouter } from "next/navigation"

export function MessagingSettingsPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    // SMS Trigger Toggles
    const [autoSmsOnReadyForPickup, setAutoSmsOnReadyForPickup] = useState(true)
    const [autoSmsOnPickedUp, setAutoSmsOnPickedUp] = useState(true)

    // Template Configuration
    const [storageFeePerDay, setStorageFeePerDay] = useState(3000)
    const [pickupDeadlineDays, setPickupDeadlineDays] = useState(7)

    const [lastUpdated, setLastUpdated] = useState<string | null>(null)

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await getSystemSettings()
                setAutoSmsOnReadyForPickup(settings.auto_sms_on_ready_for_pickup)
                setAutoSmsOnPickedUp(settings.auto_sms_on_picked_up)
                setStorageFeePerDay(settings.storage_fee_per_day)
                setPickupDeadlineDays(settings.pickup_deadline_days)
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
                auto_sms_on_ready_for_pickup: autoSmsOnReadyForPickup,
                auto_sms_on_picked_up: autoSmsOnPickedUp,
                storage_fee_per_day: storageFeePerDay,
                pickup_deadline_days: pickupDeadlineDays,
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
                            <MessageSquare className="h-8 w-8 text-red-600" />
                            Messaging Settings
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Configure SMS triggers, template values, and messaging behavior
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

            {/* SMS Trigger Controls */}
            <Card className="border-gray-200">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                        <Send className="h-6 w-6 text-blue-600" />
                        Automatic SMS Triggers
                    </CardTitle>
                    <CardDescription>
                        Control which lifecycle events automatically send SMS to customers.
                        Task registration and reminder settings are managed in Notification Settings.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Auto SMS on Ready for Pickup */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="space-y-1">
                            <Label className="text-base font-medium text-gray-900">
                                Auto SMS on Ready for Pickup
                            </Label>
                            <p className="text-sm text-gray-600">
                                Automatically send an SMS to customers when their task is approved and
                                ready for pickup. The message varies based on whether the repair was
                                solved or not solved.
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Message includes: Customer name, device info, job number, cost,
                                pickup deadline, and storage fee.
                            </p>
                        </div>
                        <Switch
                            checked={autoSmsOnReadyForPickup}
                            onCheckedChange={setAutoSmsOnReadyForPickup}
                        />
                    </div>

                    {/* Auto SMS on Picked Up */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="space-y-1">
                            <Label className="text-base font-medium text-gray-900">
                                Auto SMS on Picked Up
                            </Label>
                            <p className="text-sm text-gray-600">
                                Automatically send an SMS when a customer picks up their device.
                                Sends a thank-you message for normal pickups, or a debt reminder
                                if there&apos;s an outstanding balance.
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Normal pickup: Thank you message. Debt pickup: Outstanding balance reminder.
                            </p>
                        </div>
                        <Switch
                            checked={autoSmsOnPickedUp}
                            onCheckedChange={setAutoSmsOnPickedUp}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Template Configuration */}
            <Card className="border-gray-200">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                        <Wallet className="h-6 w-6 text-green-600" />
                        Template Values
                    </CardTitle>
                    <CardDescription>
                        Configure values used in SMS message templates. Changes here will be
                        reflected in all outgoing messages.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Storage Fee */}
                    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                        <div className="space-y-1">
                            <Label className="text-base font-medium text-gray-900 flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-green-600" />
                                Storage Fee per Day
                            </Label>
                            <p className="text-sm text-gray-600">
                                Daily storage fee charged for devices not picked up within the
                                deadline. This amount appears in SMS messages.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">TSH</span>
                            <Input
                                type="number"
                                min={0}
                                max={100000}
                                value={storageFeePerDay}
                                onChange={(e) => setStorageFeePerDay(parseInt(e.target.value) || 0)}
                                className="w-32 text-center"
                            />
                            <span className="text-sm text-gray-700">per day</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            Example in SMS: &quot;...gharama za uhifadhi TSH {storageFeePerDay.toLocaleString()}/siku...&quot;
                        </p>
                    </div>

                    {/* Pickup Deadline */}
                    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                        <div className="space-y-1">
                            <Label className="text-base font-medium text-gray-900 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-orange-600" />
                                Pickup Deadline
                            </Label>
                            <p className="text-sm text-gray-600">
                                Number of days customers have to pick up their devices after the
                                repair is complete. After this deadline, the storage fee applies.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-gray-500" />
                            <Input
                                type="number"
                                min={1}
                                max={90}
                                value={pickupDeadlineDays}
                                onChange={(e) => setPickupDeadlineDays(parseInt(e.target.value) || 7)}
                                className="w-20 text-center"
                            />
                            <span className="text-sm text-gray-700">days</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            Example in SMS: &quot;...chukua kifaa ndani ya siku {pickupDeadlineDays}...&quot;
                        </p>
                    </div>
                </CardContent>
            </Card>

            {lastUpdated && (
                <p className="text-xs text-gray-500">
                    Last updated: {new Date(lastUpdated).toLocaleString()}
                </p>
            )}
        </div>
    )
}
