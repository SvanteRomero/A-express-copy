"use client"

import { useState } from "react"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Label } from "@/components/ui/core/label"
import { Switch } from "@/components/ui/core/switch"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/feedback/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { Eye, EyeOff } from "lucide-react"

interface EditUserDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    editingUser: any
    setEditingUser: (user: any) => void
    onUpdateUser: () => void
    isLoading: boolean
}

export function EditUserDialog({ isOpen, onOpenChange, editingUser, setEditingUser, onUpdateUser, isLoading }: EditUserDialogProps) {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                    <DialogDescription>Update user information and role.</DialogDescription>
                </DialogHeader>

                {editingUser && (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-first_name">First Name</Label>
                                <Input
                                    id="edit-first_name"
                                    value={editingUser.first_name}
                                    onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-last_name">Last Name</Label>
                                <Input
                                    id="edit-last_name"
                                    value={editingUser.last_name}
                                    onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input
                                    id="edit-phone"
                                    value={editingUser.phone || ""}
                                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-role">Role</Label>
                                <Select
                                    value={editingUser.role}
                                    onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Administrator">Administrator</SelectItem>
                                        <SelectItem value="Manager">Manager</SelectItem>
                                        <SelectItem value="Technician">Technician</SelectItem>
                                        <SelectItem value="Front Desk">Front Desk</SelectItem>
                                        <SelectItem value="Accountant">Accountant</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {editingUser.role === "Technician" && (
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="edit-is_workshop"
                                        checked={editingUser.is_workshop}
                                        onCheckedChange={(checked) => setEditingUser({ ...editingUser, is_workshop: checked })}
                                    />
                                    <Label htmlFor="edit-is_workshop">Workshop</Label>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                            <div className="relative">
                                <Input
                                    id="edit-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Min. 8 characters"
                                    value={editingUser.password || ""}
                                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onUpdateUser} disabled={isLoading}>
                        {isLoading ? "Updating..." : "Update User"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
