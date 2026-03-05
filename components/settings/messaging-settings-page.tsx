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
    AlertCircle,
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
    const [autoSmsOnTaskCreation, setAutoSmsOnTaskCreation] = useState(true)
    const [autoSmsOnReadyForPickup, setAutoSmsOnReadyForPickup] = useState(true)
    const [autoSmsOnPickedUp, setAutoSmsOnPickedUp] = useState(true)

    // Pickup Reminder Settings
    const [autoPickupRemindersEnabled, setAutoPickupRemindersEnabled] = useState(false)
    const [pickupReminderHours, setPickupReminderHours] = useState(24)

    // Debt Reminder Settings
    const [autoDebtRemindersEnabled, setAutoDebtRemindersEnabled] = useState(false)
    const [debtReminderHours, setDebtReminderHours] = useState(72)
    const [debtReminderMaxDays, setDebtReminderMaxDays] = useState(30)

    // Template Configuration
    const [storageFeePerDay, setStorageFeePerDay] = useState(3000)
    const [pickupDeadlineDays, setPickupDeadlineDays] = useState(7)

    const [lastUpdated, setLastUpdated] = useState<string | null>(null)

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await getSystemSettings()
                setAutoSmsOnTaskCreation(settings.auto_sms_on_task_creation)
                setAutoSmsOnReadyForPickup(settings.auto_sms_on_ready_for_pickup)
                setAutoSmsOnPickedUp(settings.auto_sms_on_picked_up)
                setAutoPickupRemindersEnabled(settings.auto_pickup_reminders_enabled)
                setPickupReminderHours(settings.pickup_reminder_hours)
                setAutoDebtRemindersEnabled(settings.auto_debt_reminders_enabled)
                setDebtReminderHours(settings.debt_reminder_hours)
                setDebtReminderMaxDays(settings.debt_reminder_max_days)
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
                auto_sms_on_task_creation: autoSmsOnTaskCreation,
                auto_sms_on_ready_for_pickup: autoSmsOnReadyForPickup,
                auto_sms_on_picked_up: autoSmsOnPickedUp,
                auto_pickup_reminders_enabled: autoPickupRemindersEnabled,
                pickup_reminder_hours: pickupReminderHours,
                auto_debt_reminders_enabled: autoDebtRemindersEnabled,
                debt_reminder_hours: debtReminderHours,
                debt_reminder_max_days: debtReminderMaxDays,
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
                            Configure SMS triggers, automated reminders, and template values
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
                        SMS Notifications
                    </CardTitle>
                    <CardDescription>
                        Control which lifecycle events automatically send SMS to customers
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

                    {/* Auto SMS on Ready for Pickup */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="space-y-1">
                            <Label className="text-base font-medium text-gray-900">
                                Auto SMS on Ready for Pickup
                            </Label>
                            <p className="text-sm text-gray-600">
                                Automatically send an SMS when a task is approved and
                                ready for pickup. Message varies based on whether the repair was
                                solved or not solved.
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Includes: Customer name, device info, job number, cost,
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
                        </div>
                        <Switch
                            checked={autoSmsOnPickedUp}
                            onCheckedChange={setAutoSmsOnPickedUp}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Automated Reminders */}
            <Card className="border-gray-200">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                        <Clock className="h-6 w-6 text-purple-600" />
                        Automated Reminders
                    </CardTitle>
                    <CardDescription>
                        Configure scheduled SMS reminders sent automatically by the system
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                                    Reminds customers of the pickup deadline and storage fees.
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

                    {/* Auto Debt Reminders */}
                    <div className="p-4 bg-amber-50 rounded-lg space-y-4 border border-amber-200">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label className="text-base font-medium text-gray-900 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                    Automatic Debt Reminders
                                </Label>
                                <p className="text-sm text-gray-600">
                                    Automatically send reminder SMS to customers who have outstanding
                                    debts (picked up devices without full payment).
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Reminds customers of their outstanding balance.
                                </p>
                            </div>
                            <Switch
                                checked={autoDebtRemindersEnabled}
                                onCheckedChange={setAutoDebtRemindersEnabled}
                            />
                        </div>

                        {autoDebtRemindersEnabled && (
                            <div className="space-y-3 pt-3 border-t border-amber-200">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-gray-500" />
                                    <Label className="text-sm text-gray-700">
                                        Send reminder every
                                    </Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={720}
                                        value={debtReminderHours}
                                        onChange={(e) => setDebtReminderHours(parseInt(e.target.value) || 72)}
                                        className="w-20 text-center"
                                    />
                                    <span className="text-sm text-gray-700">hours</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5 text-gray-500" />
                                    <Label className="text-sm text-gray-700">
                                        Stop reminders after
                                    </Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={debtReminderMaxDays}
                                        onChange={(e) => setDebtReminderMaxDays(parseInt(e.target.value) || 30)}
                                        className="w-20 text-center"
                                    />
                                    <span className="text-sm text-gray-700">days since pickup</span>
                                </div>
                            </div>
                        )}
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
                        Configure values used in SMS message templates. Changes are
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
