"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/core/button";
import { Input } from "@/components/ui/core/input";
import { Textarea } from "@/components/ui/core/textarea";
import { Label } from "@/components/ui/core/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/feedback/dialog";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { MessageTemplate } from "./types";
import { useToast } from "@/hooks/use-toast";

import { getMessageTemplates, createMessageTemplate, updateMessageTemplate, deleteMessageTemplate } from "@/lib/api-client";

export function TemplateManager() {
    const { toast } = useToast();

    // State
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({ name: "", content: "" });
    const [loading, setLoading] = useState(false);

    // Delete confirmation state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Fetch on mount
    const fetchTemplates = async () => {
        try {
            const data = await getMessageTemplates();
            const results = Array.isArray(data) ? data : data.results || [];
            setTemplates(results);
        } catch (error) {
            console.error("Failed to fetch templates", error);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleEdit = (template: MessageTemplate) => {
        setEditingTemplate(template);
        setFormData({ name: template.name, content: template.content });
        setIsDialogOpen(true);
    };

    const handleNew = () => {
        setEditingTemplate(null);
        setFormData({ name: "", content: "" });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.content) {
            toast({
                title: "Missing Fields",
                description: "Please fill in all fields.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            if (editingTemplate) {
                if (editingTemplate.id) {
                    await updateMessageTemplate(editingTemplate.id, {
                        name: formData.name,
                        content: formData.content
                    });
                }
            } else {
                await createMessageTemplate({
                    name: formData.name,
                    content: formData.content
                });
            }
            toast({
                title: "Success",
                description: editingTemplate ? "Template updated." : "Template created.",
            });
            fetchTemplates();
            setIsDialogOpen(false);
            setEditingTemplate(null);
            setFormData({ name: "", content: "" });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save template.",
                variant: "destructive",
            });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (template: MessageTemplate) => {
        setTemplateToDelete(template);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!templateToDelete?.id) return;

        setDeleting(true);
        try {
            await deleteMessageTemplate(templateToDelete.id);
            toast({
                title: "Deleted",
                description: `Template "${templateToDelete.name}" has been deleted.`,
            });
            fetchTemplates();
            setDeleteConfirmOpen(false);
            setTemplateToDelete(null);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete template.",
                variant: "destructive",
            });
            console.error(error);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Message Templates</CardTitle>
                        <CardDescription>Manage reusable SMS templates for bulk messaging.</CardDescription>
                    </div>
                    <Button onClick={handleNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Template
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Template Name</TableHead>
                                <TableHead>Content Preview</TableHead>
                                <TableHead className="w-[120px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.map(template => (
                                <TableRow key={template.key || template.id}>
                                    <TableCell className="font-medium">
                                        {template.name}
                                        {template.is_default && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                System
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-[300px]">
                                        {template.content}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {!template.is_default && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(template)}
                                                        title="Edit template"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(template)}
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        title="Delete template"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            {template.is_default && (
                                                <span className="text-xs text-muted-foreground">Read-only</span>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit/Create Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Template Name</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Holiday Greeting"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Content</Label>
                            <Textarea
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                rows={5}
                                placeholder="Type your message here..."
                            />
                            <p className="text-xs text-muted-foreground">
                                Variables: {"{customer}"}, {"{device}"}, {"{taskId}"}, {"{description}"}, {"{notes}"}, {"{amount}"}, {"{daysWaiting}"}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Template</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={deleting}
                        >
                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
