"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import { ProfilePictureCard } from "./profile-tab/profile-picture-card"
import { PersonalInfoCard } from "./profile-tab/personal-info-card"
import { EmployeeInfoCard } from "./profile-tab/employee-info-card"
import { PasswordCard } from "./security-tab/password-card"
import { SessionManagementCard } from "./security-tab/session-management-card"
import { ActivityTimelineCard } from "./activity-tab/activity-timeline-card"

export function UserProfileView() {
    const { user } = useAuth()
    const {
        isLoading,
        error,
        success,
        updateProfile,
        changePassword,
        uploadProfilePicture,
        clearMessages
    } = useProfile()

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">User Profile</h1>
                <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Profile Picture and Basic Info */}
                        <ProfilePictureCard
                            user={user}
                            isLoading={isLoading}
                            uploadProfilePicture={uploadProfilePicture}
                        />

                        {/* Personal Information */}
                        <PersonalInfoCard
                            user={user}
                            updateProfile={updateProfile}
                        />
                    </div>

                    {/* Employee Information */}
                    <EmployeeInfoCard user={user} />
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <PasswordCard
                            isLoading={isLoading}
                            error={error}
                            success={success}
                            changePassword={changePassword}
                            clearMessages={clearMessages}
                        />
                        <SessionManagementCard />
                    </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="space-y-6">
                    <ActivityTimelineCard />
                </TabsContent>
            </Tabs>
        </div>
    )
}
