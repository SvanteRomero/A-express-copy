"use client"

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

interface AddUserDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    newUser: any
    setNewUser: (user: any) => void
    onAddUser: () => void
    isLoading: boolean
}

export function AddUserDialog({ isOpen, onOpenChange, newUser, setNewUser, onAddUser, isLoading }: AddUserDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add New Team Member</DialogTitle>
                    <DialogDescription>Create a new user account for your team member.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username *</Label>
                            <Input
                                id="username"
                                value={newUser.username}
                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                placeholder="Enter username"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                placeholder="Enter email address"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="first_name">First Name *</Label>
                            <Input
                                id="first_name"
                                value={newUser.first_name}
                                onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                                placeholder="Enter first name"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="last_name">Last Name *</Label>
                            <Input
                                id="last_name"
                                value={newUser.last_name}
                                onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                                placeholder="Enter last name"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={newUser.phone}
                                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">Role *</Label>
                            <Select
                                value={newUser.role}
                                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
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
                    </div>

                    {newUser.role === "Technician" && (
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_workshop"
                                checked={newUser.is_workshop}
                                onCheckedChange={(checked) => setNewUser({ ...newUser, is_workshop: checked })}
                            />
                            <Label htmlFor="is_workshop">Workshop</Label>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="password">Password *</Label>
                        <Input
                            id="password"
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            placeholder="Enter password"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onAddUser} disabled={isLoading}>
                        {isLoading ? "Adding..." : "Add User"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
