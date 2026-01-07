"use client"

import { ChangeEvent, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { User } from "lucide-react"
import { Badge } from "@/components/ui/core/badge"

interface ProfilePictureCardProps {
    user: any
    isLoading: boolean
    uploadProfilePicture: (file: File) => Promise<boolean> // Assuming return type
}

export function ProfilePictureCard({ user, isLoading, uploadProfilePicture }: ProfilePictureCardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
    const profilePictureUrl = user?.profile_picture || "/placeholder-user.jpg"

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "Administrator":
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Administrator</Badge>
            case "Manager":
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Manager</Badge>
            case "Technician":
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Technician</Badge>
            case "Front Desk":
                return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Front Desk</Badge>
            default:
                return <Badge variant="secondary">{role}</Badge>
        }
    }

    const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file')
            return
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('File size must be less than 5MB')
            return
        }

        await uploadProfilePicture(file)
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    return (
        <Card className="md:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Picture
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={profilePictureUrl} />
                        {/* Fallback option if needed
            <AvatarFallback className="text-lg bg-red-100 text-red-600">
              {fullName?.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback> */}
                    </Avatar>
                    <div className="text-center">
                        <h3 className="font-semibold text-lg">{fullName}</h3>
                        <p className="text-gray-600">{user?.email}</p>
                        {getRoleBadge(user?.role || "")}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={triggerFileInput}
                        disabled={isLoading}
                    >
                        {isLoading ? "Uploading..." : "Change Picture"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
