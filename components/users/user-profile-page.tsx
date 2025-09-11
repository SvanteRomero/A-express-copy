"use client"

import { ChangeEvent, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Label } from "@/components/ui/core/label"
import { Textarea } from "@/components/ui/core/textarea"
import { Badge } from "@/components/ui/core/badge"
import { Switch } from "@/components/ui/core/switch"
import { getMediaUrl } from "@/lib/media-utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/core/separator"
import {
  User,
  Calendar,
  Shield,
  Bell,
  Activity,
  Edit,
  Save,
  X,
  Key,
  Smartphone,
  Clock,
  Monitor,
  Settings,
  CheckCircle,
  FileText,
  UserCheck,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

import { useProfile } from "@/lib/use-profile"
import { profile } from "console"
import { create } from "domain"

// Mock user data
// const mockUserData = {
//   profilePicture: "",
//   phone: "(555) 123-4567",
//   address: "123 Main St, Anytown, ST 12345",
//   bio: "Experienced professional dedicated to providing excellent service at A+ express.",
//   employeeId: "EMP-001",
//   department: "Management",
//   startDate: "2023-01-15",
//   lastLogin: "2024-01-15 09:30 AM",
//   twoFactorEnabled: false,
//   emailNotifications: true,
//   pushNotifications: true,
//   taskUpdates: true,
//   systemAlerts: true,
//   weeklyReports: false,
// }

// Mock activity data
const mockActivity = [
  {
    id: "1",
    type: "task",
    action: "Created new task T-1025",
    timestamp: "2024-01-15 14:30",
    details: "MacBook Air repair for David Wilson",
  },
  {
    id: "2",
    type: "profile",
    action: "Updated profile information",
    timestamp: "2024-01-15 10:15",
    details: "Changed phone number",
  },
  {
    id: "3",
    type: "security",
    action: "Password changed",
    timestamp: "2024-01-14 16:45",
    details: "Security credentials updated",
  },
  {
    id: "4",
    type: "report",
    action: "Generated monthly report",
    timestamp: "2024-01-14 09:00",
    details: "Revenue report for December 2023",
  },
  {
    id: "5",
    type: "task",
    action: "Completed task T-1020",
    timestamp: "2024-01-13 15:20",
    details: "Surface Laptop repair completed",
  },
]


export function UserProfilePage() {
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
  const [isEditing, setIsEditing] = useState(false)



  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    profile_picture: user?.profile_picture || "",
    email: user?.email || "",
    lastlogin: user?.last_login || "",
    created_at: user?.created_at || "",
    phone: user?.phone || "",
    address: user?.address || "",
    bio: user?.bio || "",
  })

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })




  // Generate full name from first and last name
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim()



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
      profile_picture: user?.profile_picture || "",
      email: user?.email || "",
      lastlogin: user?.last_login || "",
      created_at: user?.created_at || "",
      phone: user?.phone || "",
      address: user?.address || "",
      bio: user?.bio || "",
    })
    setIsEditing(false)
    clearMessages()
  }

  const handlePasswordChange = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert("New passwords don't match!")
      return
    }

    const success = await changePassword(passwordData)
    if (success) {
      setIsChangingPassword(false)
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      })
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



  const getActivityIcon = (type: string) => {
    switch (type) {
      case "task":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "profile":
        return <User className="h-4 w-4 text-blue-600" />
      case "security":
        return <Shield className="h-4 w-4 text-red-600" />
      case "report":
        return <FileText className="h-4 w-4 text-purple-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const formatEmployeeId = (id: number): string => {
    return `EMP-${id.toString().padStart(3, '0')}`
  }


  const getDepartmentFromRole = (role: string): string => {
    switch (role) {
      case "Administrator":
        return "Administration"
      case "Manager":
        return "Management"
      case "Technician":
        return "Technical Services"
      case "Front Desk":
        return "Customer Service"
      default:
        return role
    }
  }

  const profilePictureUrl = user?.profile_picture
    ? getMediaUrl(user.profile_picture)
    : "/placeholder-user.jpg"




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

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">User Profile</h1>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Profile Picture and Basic Info */}
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
                    <AvatarImage src={profilePictureUrl || "/placeholder.svg"} />

                    {/* <AvatarFallback className="text-lg bg-red-100 text-red-600">
                      {fullName
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")}
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

            {/* Personal Information */}
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
                  <div className="space-y-2">

                    {/* <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      disabled={!isEditing}
                    /> */}
                  </div>
                </div>
                <div className="space-y-2">
                  {/* <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!isEditing}
                    rows={3}
                  /> */}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Employee Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Employee Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Employee ID</p>
                    {user?.id ? formatEmployeeId(user?.id) : "EMP-000"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Settings className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    {user?.role ? getDepartmentFromRole(user.role) : "Not Assigned"}

                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-medium">
                      {new Date(formData.created_at).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Login</p>

                    <p className="font-medium">
                      {new Date(formData.lastlogin).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>

                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Session Management
                </CardTitle>
                <CardDescription>Monitor and manage your active sessions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Monitor className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-sm text-gray-600">Chrome on Windows</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Smartphone className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">Mobile Session</p>
                        <p className="text-sm text-gray-600">Safari on iPhone</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Revoke
                    </Button>
                  </div>
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  Sign Out All Devices
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how you want to be notified about important updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive notifications via email</p>
                  </div>
                  {/* <Switch checked={userData.emailNotifications} /> */}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-600">Receive push notifications in your browser</p>
                  </div>
                  {/* <Switch checked={userData.pushNotifications} /> */}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Task Updates</p>
                    <p className="text-sm text-gray-600">Get notified when tasks are assigned or updated</p>
                  </div>
                  {/* <Switch checked={userData.taskUpdates} /> */}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">System Alerts</p>
                    <p className="text-sm text-gray-600">Important system notifications and maintenance alerts</p>
                  </div>
                  {/* <Switch checked={userData.systemAlerts} /> */}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Weekly Reports</p>
                    <p className="text-sm text-gray-600">Receive weekly performance and activity reports</p>
                  </div>
                  {/* <Switch checked={userData.weeklyReports} /> */}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your recent actions and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                    <div className="p-2 bg-gray-100 rounded-full">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-500">{activity.timestamp}</p>
                      </div>
                      <p className="text-sm text-gray-600">{activity.details}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Button variant="outline">View Full Activity Log</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
