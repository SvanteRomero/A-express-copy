"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/core/button"; // Standard button
import { Input } from "@/components/ui/core/input";
import { Textarea } from "@/components/ui/core/textarea";
import { Label } from "@/components/ui/core/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/feedback/dialog";
import { Plus, Edit, Trash, Save } from "lucide-react";
import { MessageTemplate } from "./types";

import { getMessageTemplates, createMessageTemplate, updateMessageTemplate } from "@/lib/api-client";

export function TemplateManager() {
    // State
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({ name: "", content: "" });
    const [loading, setLoading] = useState(false);

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
        setEditingTemplate(null); // Indicate new template creation
        setFormData({ name: "", content: "" });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.content) {
            alert("Please fill in all fields.");
            return;
        }

        setLoading(true);
        try {
            if (editingTemplate) {
                if (editingTemplate.id) {
                    // Update
                    await updateMessageTemplate(editingTemplate.id, {
                        name: formData.name,
                        content: formData.content
                    });
                }
            } else {
                // Create
                await createMessageTemplate({
                    name: formData.name,
                    content: formData.content
                });
            }
            // Refresh
            fetchTemplates();
            setIsDialogOpen(false);
            setEditingTemplate(null);
            setFormData({ name: "", content: "" });
        } catch (error) {
            alert("Failed to save template.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Message Templates</CardTitle>
                        <CardDescription>Manage reusable SMS templates.</CardDescription>
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
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.map(template => (
                                <TableRow key={template.key || template.id}>
                                    <TableCell className="font-medium">
                                        {template.name}
                                        {template.is_default && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                Default
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-[300px]">
                                        {template.content}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!template.is_default && (
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

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
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Content</Label>
                            <Textarea
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                rows={5}
                            />
                            <p className="text-xs text-muted-foreground">Variables: {"{customer}, {device}, {taskId}, {description}, {notes}, {amount}, {daysWaiting}"}</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
