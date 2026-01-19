"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Label } from "@/components/ui/core/label"
import { Settings, Building2, Phone, Save, ArrowLeft, Loader2, Plus, X } from "lucide-react"
import { getSystemSettings, updateSystemSettings } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function GeneralSettingsPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const [companyName, setCompanyName] = useState('')
    const [companyPhoneNumbers, setCompanyPhoneNumbers] = useState<string[]>([])
    const [newPhoneNumber, setNewPhoneNumber] = useState('')
    const [lastUpdated, setLastUpdated] = useState<string | null>(null)

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await getSystemSettings()
                setCompanyName(settings.company_name || '')
                setCompanyPhoneNumbers(settings.company_phone_numbers || [])
                setLastUpdated(settings.updated_at)
            } catch (error) {
                console.error("Failed to fetch settings:", error)
                toast({
                    title: "Error",
                    description: "Failed to load general settings",
                    variant: "destructive",
                })
            } finally {
                setIsLoading(false)
            }
        }
        fetchSettings()
    }, [])

    const handleAddPhoneNumber = () => {
        const trimmed = newPhoneNumber.trim()
        if (trimmed && !companyPhoneNumbers.includes(trimmed)) {
            setCompanyPhoneNumbers([...companyPhoneNumbers, trimmed])
            setNewPhoneNumber('')
        }
    }

    const handleRemovePhoneNumber = (phone: string) => {
        setCompanyPhoneNumbers(companyPhoneNumbers.filter(p => p !== phone))
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const updated = await updateSystemSettings({
                company_name: companyName,
                company_phone_numbers: companyPhoneNumbers,
            })
            setLastUpdated(updated.updated_at)
            toast({
                title: "Settings Saved",
                description: "General settings have been updated successfully.",
                className: "bg-green-600 text-white border-green-600",
            })
        } catch (error) {
            console.error("Failed to save settings:", error)
            toast({
                title: "Error",
                description: "Failed to save general settings",
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
                            <Settings className="h-8 w-8 text-red-600" />
                            General Settings
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Configure basic shop information and company details
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

            {/* Company Information Card */}
            <Card className="border-gray-200">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                        <Building2 className="h-6 w-6 text-blue-600" />
                        Company Information
                    </CardTitle>
                    <CardDescription>
                        Company details used in customer communications and SMS messages
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Company Name */}
                    <div className="space-y-2">
                        <Label htmlFor="company-name">Company Name</Label>
                        <Input
                            id="company-name"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Enter company name"
                            className="max-w-md"
                        />
                        <p className="text-xs text-gray-500">
                            This name appears in SMS messages sent to customers
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Company Phone Numbers Card */}
            <Card className="border-gray-200">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                        <Phone className="h-6 w-6 text-green-600" />
                        Company Contact Numbers
                    </CardTitle>
                    <CardDescription>
                        Phone numbers customers can use to contact the shop. These are included in registration SMS messages.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add New Phone Number */}
                    <div className="flex gap-2 max-w-md">
                        <Input
                            value={newPhoneNumber}
                            onChange={(e) => setNewPhoneNumber(e.target.value)}
                            placeholder="e.g., 0712 345 678"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddPhoneNumber()}
                        />
                        <Button
                            type="button"
                            onClick={handleAddPhoneNumber}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                        </Button>
                    </div>

                    {/* Phone Numbers List */}
                    <div className="space-y-2">
                        {companyPhoneNumbers.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No phone numbers added yet</p>
                        ) : (
                            companyPhoneNumbers.map((phone, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg max-w-md"
                                >
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-gray-500" />
                                        <span className="font-medium">{phone}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemovePhoneNumber(phone)}
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>

                    <p className="text-xs text-gray-500">
                        Example SMS: "...Wasiliana nasi: 0712 345 678, 0713 456 789. Asante, {companyName || 'Company Name'}."
                    </p>

                    {lastUpdated && (
                        <p className="text-xs text-gray-500 mt-4">
                            Last updated: {new Date(lastUpdated).toLocaleString()}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
