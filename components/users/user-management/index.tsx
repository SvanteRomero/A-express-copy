"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/feedback/dialog"
import { UserPlus, Search, MapPin, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useUserManagement } from "@/lib/use-user-management"
import { useIsMobile } from "@/hooks/use-mobile"
import { LocationsManager } from "../../locations/locations-manager"
import { UserStats } from "./user-stats"
import { UserTable } from "./user-table"
import { UserMobileList } from "./user-mobile-list"
import { AddUserDialog } from "./add-user-dialog"
import { EditUserDialog } from "./edit-user-dialog"

export function UserManagement() {
    const { users, isLoading, createUser, updateUser, deleteUser, toggleUserStatus } = useUserManagement()
    const isMobile = useIsMobile()

    const [searchTerm, setSearchTerm] = useState("")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isLocationsModalOpen, setIsLocationsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<any>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [newUser, setNewUser] = useState({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        phone: "",
        role: "Technician" as const,
        password: "",
        is_workshop: false,
    })

    // Filter users based on search term
    const filteredUsers = users.filter(
        (user) =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    const handleAddUser = async () => {
        if (!newUser.username || !newUser.email || !newUser.password || !newUser.first_name || !newUser.last_name) {
            toast({
                title: "Error",
                description: "Please fill in all required fields.",
                variant: "destructive",
            })
            return
        }

        const success = await createUser(newUser)
        if (success) {
            setNewUser({
                username: "",
                email: "",
                first_name: "",
                last_name: "",
                phone: "",
                role: "Technician",
                password: "",
                is_workshop: false,
            })
            setIsAddDialogOpen(false)
        }
    }

    const handleEditUser = (user: any) => {
        setEditingUser(user)
        setIsEditOpen(true)
    }

    const handleUpdateUser = async () => {
        if (!editingUser) return

        const success = await updateUser(editingUser.id, {
            first_name: editingUser.first_name,
            last_name: editingUser.last_name,
            email: editingUser.email,
            phone: editingUser.phone,
            role: editingUser.role,
            is_workshop: editingUser.is_workshop,
        })

        if (success) {
            setIsEditOpen(false)
            // Optional: setEditingUser(null) after delay or on next open to prevent "empty" flash during close animation
        }
    }

    const handleDeleteUser = async (userId: number) => {
        await deleteUser(userId)
    }

    const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
        await toggleUserStatus(userId, !currentStatus)
    }

    if (isLoading && users.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading users...</span>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <UserStats users={users} />

            {/* User Management Table/List */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Team Management</CardTitle>
                            <CardDescription>Manage your team members and their access levels</CardDescription>
                        </div>
                        <div className="flex gap-4">
                            <Dialog open={isLocationsModalOpen} onOpenChange={setIsLocationsModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <MapPin className="mr-2 h-4 w-4" />
                                        Locations
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Manage Locations</DialogTitle>
                                    </DialogHeader>
                                    <LocationsManager />
                                </DialogContent>
                            </Dialog>

                            <Button onClick={() => setIsAddDialogOpen(true)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add Team Member
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search team members..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isMobile ? (
                        <UserMobileList
                            users={filteredUsers}
                            onEdit={handleEditUser}
                            onDelete={handleDeleteUser}
                            onToggleStatus={handleToggleStatus}
                            isLoading={isLoading}
                        />
                    ) : (
                        <UserTable
                            users={filteredUsers}
                            onEdit={handleEditUser}
                            onDelete={handleDeleteUser}
                            onToggleStatus={handleToggleStatus}
                            isLoading={isLoading}
                        />
                    )}
                </CardContent>
            </Card>

            <AddUserDialog
                isOpen={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                newUser={newUser}
                setNewUser={setNewUser}
                onAddUser={handleAddUser}
                isLoading={isLoading}
            />

            <EditUserDialog
                isOpen={isEditOpen}
                onOpenChange={setIsEditOpen}
                editingUser={editingUser}
                setEditingUser={setEditingUser}
                onUpdateUser={handleUpdateUser}
                isLoading={isLoading}
            />
        </div>
    )
}
