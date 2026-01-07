"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Label } from "@/components/ui/core/label"
import { Separator } from "@/components/ui/core/separator"
import { Key } from "lucide-react"

interface PasswordCardProps {
    isLoading: boolean
    error: string | null
    success: string | null
    changePassword: (data: any) => Promise<boolean>
    clearMessages: () => void
}

export function PasswordCard({
    isLoading,
    error,
    success,
    changePassword,
    clearMessages
}: PasswordCardProps) {
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    })

    const handlePasswordChange = async () => {
        if (passwordData.new_password !== passwordData.confirm_password) {
            alert("New passwords don't match!")
            return
        }

        const result = await changePassword(passwordData)
        if (result) {
            setIsChangingPassword(false)
            setPasswordData({
                current_password: "",
                new_password: "",
                confirm_password: "",
            })
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Password & Authentication
                </CardTitle>
                <CardDescription>Manage your password and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!isChangingPassword ? (
                    <Button className="w-full" onClick={() => setIsChangingPassword(true)}>
                        Change Password
                    </Button>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="current_password">Current Password</Label>
                            <Input
                                id="current_password"
                                type="password"
                                value={passwordData.current_password}
                                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                placeholder="Enter current password"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new_password">New Password</Label>
                            <Input
                                id="new_password"
                                type="password"
                                value={passwordData.new_password}
                                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                placeholder="Enter new password (min 8 characters)"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm_password">Confirm New Password</Label>
                            <Input
                                id="confirm_password"
                                type="password"
                                value={passwordData.confirm_password}
                                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                placeholder="Confirm new password"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                className="flex-1"
                                onClick={handlePasswordChange}
                                disabled={isLoading}
                            >
                                {isLoading ? "Updating..." : "Update Password"}
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setIsChangingPassword(false)
                                    setPasswordData({
                                        current_password: "",
                                        new_password: "",
                                        confirm_password: "",
                                    })
                                    clearMessages()
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm">
                        {success}
                    </div>
                )}

                <Separator />
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-600">Add an extra layer of security</p>
                    </div>
                    {/* <Switch checked={userData.twoFactorEnabled} /> */}
                </div>
            </CardContent>
        </Card>
    )
}
