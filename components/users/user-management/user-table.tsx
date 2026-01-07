"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Button } from "@/components/ui/core/button"
import { Badge } from "@/components/ui/core/badge"
import { Switch } from "@/components/ui/core/switch"
import { Edit, Trash2 } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/feedback/alert-dialog"

interface UserTableProps {
    users: any[]
    onEdit: (user: any) => void
    onDelete: (userId: number) => void
    onToggleStatus: (userId: number, currentStatus: boolean) => void
    isLoading: boolean
}

export function UserTable({ users, onEdit, onDelete, onToggleStatus, isLoading }: UserTableProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString()
    }

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString()
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Workshop</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user) => (
                    <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.id}</TableCell>
                        <TableCell>{user.first_name} {user.last_name}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={user.role === "Manager" ? "bg-blue-100 text-blue-800" : user.role === "Technician" ? "bg-green-100 text-green-800" : user.role === "Accountant" ? "bg-yellow-100 text-yellow-800" : "bg-purple-100 text-purple-800"}>
                                {user.role}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {user.role === "Technician" && (
                                <Badge variant={user.is_workshop ? "default" : "secondary"}>
                                    {user.is_workshop ? "Yes" : "No"}
                                </Badge>
                            )}
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={user.is_active}
                                    onCheckedChange={() => onToggleStatus(user.id, user.is_active)}
                                    disabled={isLoading}
                                />
                                <Badge variant={user.is_active ? "default" : "secondary"}>
                                    {user.is_active ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                        </TableCell>
                        <TableCell>
                            {user.last_login ? formatDateTime(user.last_login) : "Never"}
                        </TableCell>
                        <TableCell>
                            {user.created_at ? formatDate(user.created_at) : "N/A"}
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => onEdit(user)}>
                                    <Edit className="h-4 w-4" />
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the user account for{" "}
                                                {user.first_name} {user.last_name}.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDelete(user.id)}>
                                                Delete User
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
