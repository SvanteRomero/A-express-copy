"use client"

import { ChangeEvent, useRef, useState, useEffect } from "react"
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
import { getSessions, revokeSession, revokeAllSessions, getAuditLogs, getProfileActivity, getTaskActivities } from "@/lib/api-client"
import { profile } from "console"
import { create } from "domain"


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

  // Sessions state for Security tab
  const [sessions, setSessions] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  // Activity items loaded from server
  const [activityItems, setActivityItems] = useState<any[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityPage, setActivityPage] = useState(1)
  const [activityHasMore, setActivityHasMore] = useState(false)

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

  useEffect(() => {
    // Load sessions and activity when component mounts
    const loadSessions = async () => {
      setLoadingSessions(true)
      try {
        const resp = await getSessions()
        setSessions(resp.data || [])
      } catch (err) {
        console.error('Failed to load sessions', err)
      } finally {
        setLoadingSessions(false)
      }
    }

    const loadActivity = async (page = 1) => {
      setActivityLoading(true)
      try {
        const resp = await getProfileActivity({ page, page_size: 25 })
        const data = resp.data || {}
        setActivityItems(data.results || [])
        setActivityHasMore(!!data.has_more)
        setActivityPage(data.page || 1)
      } catch (err) {
        console.error('Failed to load profile activity', err)
      } finally {
        setActivityLoading(false)
      }
    }

    loadSessions()
    loadActivity()
  }, [])



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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
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
                  {loadingSessions ? (
                    <p className="text-sm text-gray-600">Loading sessions...</p>
                  ) : (
                    sessions.length > 0 ? (
                      sessions.map((s) => (
                        <div key={s.id} className={`flex items-center justify-between p-3 border rounded-lg ${s.is_current ? 'border-green-300 bg-green-50' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${s.is_current ? 'bg-green-100' : 'bg-gray-100'}`}>
                              <Monitor className={`h-4 w-4 ${s.is_current ? 'text-green-600' : 'text-gray-600'}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{s.device_info || s.device_name || 'Unknown device'}</p>
                                {s.is_current && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">Current Session</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{s.ip_address || 'Unknown IP'} · {new Date(s.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!s.is_revoked ? (
                              <Button variant="outline" size="sm" onClick={async () => {
                                // Show confirmation dialog
                                const confirmMessage = s.is_current
                                  ? "This will end your current session and log you out. Are you sure?"
                                  : "Are you sure you want to revoke this session?";

                                if (!window.confirm(confirmMessage)) {
                                  return;
                                }

                                try {
                                  const resp = await revokeSession(s.id);
                                  setSessions((prev) => prev.map((ps) => ps.id === s.id ? { ...ps, is_revoked: true } : ps));

                                  // If revoking current session, redirect to login
                                  if (resp.data?.logout_required) {
                                    localStorage.removeItem('auth_user');
                                    window.location.href = '/';
                                  }
                                } catch (err) {
                                  console.error('Failed to revoke session', err);
                                }
                              }}>
                                {s.is_current ? 'End Session' : 'Revoke'}
                              </Button>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-700">Revoked</Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600">No active sessions found.</p>
                    )
                  )}
                </div>
                <Button variant="outline" className="w-full bg-transparent text-red-600 hover:bg-red-50 hover:text-red-700" onClick={async () => {
                  // Show confirmation dialog
                  if (!window.confirm("This will sign you out of ALL devices, including this one. You will need to log in again. Are you sure?")) {
                    return;
                  }

                  try {
                    await revokeAllSessions();
                    // Clear local storage and redirect to login
                    localStorage.removeItem('auth_user');
                    window.location.href = '/';
                  } catch (err) {
                    console.error('Failed to revoke all sessions', err);
                  }
                }}>
                  Sign Out All Devices
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>



        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Activity Timeline
                  </CardTitle>
                  <CardDescription>Your recent actions and system events</CardDescription>
                </div>
                <div className="text-sm text-gray-500">
                  {activityItems.length} event{activityItems.length !== 1 ? 's' : ''}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : activityItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No activity yet</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  
                  <div className="space-y-4">
                    {activityItems.map((activity, idx) => {
                      // Determine category color
                      const categoryColors: Record<string, string> = {
                        task: 'bg-green-100 text-green-600 border-green-200',
                        profile: 'bg-blue-100 text-blue-600 border-blue-200',
                        security: 'bg-red-100 text-red-600 border-red-200',
                        report: 'bg-purple-100 text-purple-600 border-purple-200',
                        payment: 'bg-amber-100 text-amber-600 border-amber-200',
                        customer: 'bg-cyan-100 text-cyan-600 border-cyan-200',
                      };
                      const category = activity.category || activity.source || 'default';
                      const colorClass = categoryColors[category] || 'bg-gray-100 text-gray-600 border-gray-200';
                      
                      // Format relative time
                      const getRelativeTime = (timestamp: string) => {
                        const now = new Date();
                        const activityTime = new Date(timestamp);
                        const diffMs = now.getTime() - activityTime.getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffDays = Math.floor(diffMs / 86400000);
                        
                        if (diffMins < 1) return 'Just now';
                        if (diffMins < 60) return `${diffMins}m ago`;
                        if (diffHours < 24) return `${diffHours}h ago`;
                        if (diffDays < 7) return `${diffDays}d ago`;
                        return activityTime.toLocaleDateString();
                      };

                      return (
                        <div key={activity.id} className="relative pl-10">
                          {/* Timeline dot */}
                          <div className={`absolute left-2 w-4 h-4 rounded-full border-2 ${colorClass}`} />
                          
                          <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <div className={`p-2 rounded-lg ${colorClass}`}>
                                  {getActivityIcon(category)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900">{activity.message}</p>
                                  {activity.metadata?.summary && (
                                    <p className="text-sm text-gray-600 mt-1">{activity.metadata.summary}</p>
                                  )}
                                  {activity.related_task && (
                                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                                      <FileText className="h-3 w-3" />
                                      <span>Task: {activity.related_task.title}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 text-right">
                                <span className="text-xs text-gray-400">{getRelativeTime(activity.timestamp)}</span>
                                <Badge className={`text-xs ${colorClass} border`}>
                                  {category.charAt(0).toUpperCase() + category.slice(1)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Load more button */}
              {activityHasMore && (
                <div className="mt-6 text-center">
                  <Button variant="outline" onClick={async () => {
                    const nextPage = activityPage + 1;
                    try {
                      const resp = await getProfileActivity({ page: nextPage, page_size: 25 });
                      const data = resp.data || {};
                      setActivityItems((prev) => [...prev, ...(data.results || [])]);
                      setActivityHasMore(!!data.has_more);
                      setActivityPage(data.page || nextPage);
                    } catch (err) {
                      console.error('Failed to load more activity', err);
                    }
                  }}>
                    Load more activity
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
