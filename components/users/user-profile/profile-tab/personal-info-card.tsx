"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Label } from "@/components/ui/core/label"
import { User, Edit, Save, X } from "lucide-react"

interface PersonalInfoCardProps {
    user: any
    updateProfile: (data: any) => Promise<boolean>
}

export function PersonalInfoCard({ user, updateProfile }: PersonalInfoCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        // Address and Bio were commented out in original, keeping them structurally if needed but commented out or hidden
        address: user?.address || "",
        bio: user?.bio || "",
    })

    // Sync state with user prop when not editing or if user changes
    // Actually, usually beneficial to reset form when user prop changes, but standard pattern is initial state.
    // For simplicity we keep it as initial state, but might rename keys if needed.

    const handleSave = async () => {
        const cleanData = {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
        }

        const success = await updateProfile(cleanData)
        if (success) {
            setIsEditing(false)
        }
    }

    const handleCancel = () => {
        setFormData({
            first_name: user?.first_name || "",
            last_name: user?.last_name || "",
            email: user?.email || "",
            phone: user?.phone || "",
            address: user?.address || "",
            bio: user?.bio || "",
        })
        setIsEditing(false)
    }

    return (
        <Card className="md:col-span-2">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Personal Information
                    </CardTitle>
                    {!isEditing ? (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleSave}>
                                <Save className="h-4 w-4 mr-2" />
                                Save
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleCancel}>
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                            id="first_name"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            disabled={!isEditing}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                            id="last_name"
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            disabled={!isEditing}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={!isEditing}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            disabled={!isEditing}
                        />
                    </div>
                    {/* <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={!isEditing}
            /> 
          </div>*/}
                </div>
                {/* <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            disabled={!isEditing}
            rows={3}
          />
        </div> */}
            </CardContent>
        </Card>
    )
}
