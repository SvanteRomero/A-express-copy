"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/layout/card"
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

interface UserMobileListProps {
    users: any[]
    onEdit: (user: any) => void
    onDelete: (userId: number) => void
    onToggleStatus: (userId: number, currentStatus: boolean) => void
    isLoading: boolean
}

export function UserMobileList({ users, onEdit, onDelete, onToggleStatus, isLoading }: UserMobileListProps) {
    return (
        <div className="space-y-4">
            {users.map((user) => (
                <Card key={user.id}>
                    <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="font-semibold">{user.first_name} {user.last_name}</div>
                                <div className="text-sm text-muted-foreground">{user.username}</div>
                            </div>
                            <Badge variant="outline" className={user.role === "Manager" ? "bg-blue-100 text-blue-800" : user.role === "Technician" ? "bg-green-100 text-green-800" : user.role === "Accountant" ? "bg-yellow-100 text-yellow-800" : "bg-purple-100 text-purple-800"}>
                                {user.role}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                        <div className="text-sm">
                            <span className="text-muted-foreground block">Email:</span>
                            {user.email}
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Status:</span>
                                <Switch
                                    checked={user.is_active}
                                    onCheckedChange={() => onToggleStatus(user.id, user.is_active)}
                                    disabled={isLoading}
                                />
                            </div>
                            <Badge variant={user.is_active ? "default" : "secondary"}>
                                {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                        </div>
                        {user.role === "Technician" && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Workshop:</span>
                                <Badge variant={user.is_workshop ? "default" : "secondary"}>
                                    {user.is_workshop ? "Yes" : "No"}
                                </Badge>
                            </div>
                        )}
                    </CardContent>
                    <div className="p-2 bg-gray-50 flex justify-end gap-2 border-t rounded-b-lg">
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
                </Card>
            ))}
        </div>
    )
}
