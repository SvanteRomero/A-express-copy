"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/core/button";
import { Input } from "@/components/ui/core/input";
import { Textarea } from "@/components/ui/core/textarea";
import { Label } from "@/components/ui/core/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select";
import { Checkbox } from "@/components/ui/core/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table";
import { Badge } from "@/components/ui/core/badge";
import { Search, Phone, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Customer, MessageTemplate } from "./types";
import { replaceTemplateVariables, getStatusColor } from "./utils";
import { useTasks } from "@/hooks/use-tasks";
import { getMessageTemplates, sendBulkSMS } from "@/lib/api-client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/feedback/dialog";

const ITEMS_PER_PAGE = 20;

export function ComposeView() {
    // State
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");
    const [customMessage, setCustomMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [useCustomMessage, setUseCustomMessage] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Phone Number Management
    const [managementTarget, setManagementTarget] = useState<Customer | null>(null);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);

    // Persist selected customer task IDs across pages
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
    // Store customer data for selected items (for preview modal)
    const [selectedCustomersData, setSelectedCustomersData] = useState<Map<number, Customer>>(new Map());

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to first page on search
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Derive template_filter from selected template
    const currentTemplate = templates.find(t => t.id.toString() === selectedTemplate);

    const templateFilter = useMemo(() => {
        if (!currentTemplate || useCustomMessage) return undefined;
        const name = currentTemplate.name.toLowerCase();
        if (name.includes("ready for pickup")) return "ready_for_pickup";
        if (name.includes("repair in progress")) return "repair_in_progress";
        if (name.includes("remind debt") || name.includes("deni")) return "debt_reminder";
        return undefined;
    }, [currentTemplate, useCustomMessage]);

    // Fetch tasks with server-side pagination and filtering
    const { data: tasksData, isLoading: tasksLoading } = useTasks({
        page: currentPage,
        search: debouncedSearch || undefined,
        template_filter: templateFilter,
    });

    // Fetch Templates
    useEffect(() => {
        getMessageTemplates()
            .then(data => {
                setTemplates(data);
                if (data.length > 0) {
                    const firstValid = data.find((t: MessageTemplate) => t.name !== "General (Custom)");
                    if (firstValid) setSelectedTemplate(firstValid.id.toString());
                }
            })
            .catch(err => console.error("Failed to fetch templates:", err));
    }, []);

    // Reset selections when template changes
    useEffect(() => {
        setSelectedTaskIds(new Set());
        setSelectedCustomersData(new Map());
        setCurrentPage(1);
    }, [selectedTemplate, useCustomMessage]);

    // Transform tasks to customers
    const displayedCustomers: Customer[] = useMemo(() => {
        if (!tasksData?.results) return [];

        return tasksData.results
            .filter((task: any) => {
                const hasCustomer = task.customer || task.customer_details;
                return hasCustomer;
            })
            .map((task: any) => {
                const customer = task.customer_details || {};
                const deviceName = `${task.laptop_model_details?.name || ''} ${task.brand || ''}`.trim();
                const phoneNumbersList = customer.phone_numbers?.map((p: any) => p.phone_number) || [];
                const initialPhone = phoneNumbersList[0] || customer.phone_number_1 || '';

                return {
                    id: task.id.toString(),
                    taskId: task.id,
                    taskDisplayId: task.title || task.id.toString(),
                    customerId: customer.id ? customer.id.toString() : `unknown-${task.id}`,
                    name: (customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`).trim() || 'Unknown Customer',
                    phone: initialPhone,
                    phoneNumbers: phoneNumbersList,
                    selectedPhone: initialPhone,
                    device: deviceName || 'Unknown Device',
                    description: task.description || '',
                    deviceNotes: task.device_notes || '',
                    status: task.status,
                    workshopStatus: task.workshop_status,
                    amount: task.total_cost,
                    outstandingBalance: task.outstanding_balance,
                    isDebt: task.is_debt && parseFloat(task.outstanding_balance || '0') > 0,
                    daysWaiting: Math.floor((Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)),
                    selected: selectedTaskIds.has(task.id)
                };
            });
    }, [tasksData, selectedTaskIds]);

    const totalCount = tasksData?.count || 0;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    // Get all selected customers (from stored data)
    const selectedCustomers = useMemo(() => {
        return Array.from(selectedCustomersData.values());
    }, [selectedCustomersData]);

    const getGroupedSelectedCustomers = () => {
        const groups: { [key: string]: Customer[] } = {};
        selectedCustomers.forEach(c => {
            const key = c.customerId || `unknown-${c.id}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        });
        return groups;
    };

    const handleUpdateCustomerPhone = (customerId: string, newPhone: string) => {
        setSelectedCustomersData(prev => {
            const newMap = new Map(prev);
            newMap.forEach((customer, taskId) => {
                if (customer.customerId === customerId || (!customer.customerId && `unknown-${customer.id}` === customerId)) {
                    newMap.set(taskId, { ...customer, selectedPhone: newPhone });
                }
            });
            return newMap;
        });
    };

    const handlePreview = () => {
        if (!selectedCustomers.length) return;
        if (useCustomMessage && customMessage.includes('\n')) {
            alert("Warning: SMS cannot contain line breaks. They will be removed.");
        }
        setPreviewModalOpen(true);
    };

    const handleConfirmSend = async () => {
        setPreviewModalOpen(false);
        handleSend(true);
    };

    const handleSend = async (confirmed = false) => {
        if (!selectedCustomers.length) return;

        if (!confirmed) {
            handlePreview();
            return;
        }

        setLoading(true);

        try {
            const payload = {
                recipients: selectedCustomers.map(c => ({
                    task_id: c.taskId.toString(),
                    phone: c.selectedPhone
                })),
                message: useCustomMessage ? customMessage : undefined,
                template_id: useCustomMessage ? undefined : Number(selectedTemplate)
            };

            const data = await sendBulkSMS(payload);

            if (data.success) {
                alert(`Success: ${data.summary.sent} sent, ${data.summary.failed} failed.`);
                // Reset selection
                setSelectedTaskIds(new Set());
                setSelectedCustomersData(new Map());
                setCustomMessage("");
                setSelectedTemplate("");
                setUseCustomMessage(false);
            } else {
                alert(`Error: ${data.error || 'Failed to send messages'}`);
            }
        } catch (error) {
            alert("An error occurred while sending messages.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCustomer = (customer: Customer) => {
        const taskId = customer.taskId;
        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });

        setSelectedCustomersData(prev => {
            const newMap = new Map(prev);
            if (newMap.has(taskId)) {
                newMap.delete(taskId);
            } else {
                newMap.set(taskId, customer);
            }
            return newMap;
        });
    };

    const getStatusBadgeColor = (status: string, workshopStatus?: string) => {
        if (workshopStatus === "Not Solved") return "bg-red-100 text-red-800 border-red-200 hover:bg-red-100";
        if (workshopStatus === "Solved") return "bg-green-100 text-green-800 border-green-200 hover:bg-green-100";

        const s = status.toLowerCase();
        if (s.includes('completed') || s.includes('ready')) return "bg-green-100 text-green-800 border-green-200 hover:bg-green-100";
        if (s.includes('progress') || s.includes('diagnostic')) return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100";
        if (s.includes('pending') || s.includes('waiting')) return "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
        if (s.includes('cancelled') || s.includes('failed')) return "bg-red-100 text-red-800 border-red-200 hover:bg-red-100";
        return "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100";
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Compose Message</CardTitle>
                            <CardDescription>Select potential recipients and customize your message.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {!useCustomMessage && (
                                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                    <Label>Template</Label>
                                    <Select
                                        value={selectedTemplate}
                                        onValueChange={setSelectedTemplate}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a template..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates
                                                .filter(t => t.name !== "General (Custom)")
                                                .map(t => (
                                                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox
                                    id="use-custom"
                                    checked={useCustomMessage}
                                    onCheckedChange={(checked) => {
                                        setUseCustomMessage(!!checked);
                                        if (!checked) {
                                            setCustomMessage("");
                                            if (!selectedTemplate && templates.length > 0) {
                                                const firstValid = templates.find(t => t.name !== "General (Custom)");
                                                if (firstValid) setSelectedTemplate(firstValid.id.toString());
                                            }
                                        }
                                    }}
                                />
                                <Label htmlFor="use-custom" className="font-normal cursor-pointer">
                                    Write a custom message instead
                                </Label>
                            </div>

                            {useCustomMessage && (
                                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                    <Label>Custom Message</Label>
                                    <Textarea
                                        placeholder="Type your message here..."
                                        value={customMessage}
                                        onChange={e => setCustomMessage(e.target.value)}
                                        rows={4}
                                    />
                                    <p className="text-xs text-yellow-600">Note: Line breaks are not supported by the SMS provider.</p>
                                </div>
                            )}

                            {!useCustomMessage && currentTemplate && (
                                <div className="p-3 bg-muted rounded text-sm text-muted-foreground">
                                    <span className="font-semibold block mb-1">Preview:</span>
                                    {currentTemplate.content}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Recipients ({selectedCustomers.length})</CardTitle>
                                <Button onClick={() => handleSend(false)} disabled={loading || !selectedCustomers.length}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                                    Send Bulk SMS
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="relative mb-4">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search recipients..." className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            </div>

                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {tasksLoading ? (
                                    <div className="text-center py-8 text-muted-foreground">Loading recipients...</div>
                                ) : displayedCustomers.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No customers found matching your search.</div>
                                ) : (
                                    displayedCustomers.map(customer => {
                                        const canSelect = !!selectedTemplate || useCustomMessage;
                                        const isSelected = selectedTaskIds.has(customer.taskId);
                                        return (
                                            <div key={customer.id} className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'} ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <Checkbox
                                                    id={`c-${customer.id}`}
                                                    checked={isSelected}
                                                    onCheckedChange={() => canSelect && toggleCustomer(customer)}
                                                    disabled={!canSelect}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor={`c-${customer.id}`} className={`font-medium ${canSelect ? 'cursor-pointer' : 'cursor-not-allowed'}`}>{customer.name}</Label>
                                                        <div className="flex items-center gap-2">
                                                            {customer.isDebt && <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">Debt</Badge>}
                                                            <Badge className={getStatusBadgeColor(customer.status, customer.workshopStatus)} variant="outline">
                                                                {customer.workshopStatus ? `${customer.status} (${customer.workshopStatus})` : customer.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <span>{customer.device}</span>
                                                        <span>•</span>
                                                        <span className={customer.phoneNumbers.length > 1 ? "text-primary font-medium" : ""}>
                                                            {customer.selectedPhone || "No Phone"}
                                                        </span>
                                                        {customer.phoneNumbers.length > 1 && (
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="h-6 px-2 text-xs border border-primary/20 hover:bg-primary/10 text-primary"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setManagementTarget(customer);
                                                                }}
                                                            >
                                                                Change
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1 || tasksLoading}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Page {currentPage} of {totalPages} ({totalCount} total)
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages || tasksLoading}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Confirm Bulk Send</DialogTitle>
                        <DialogDescription>
                            Review messages and confirm recipients. You can update phone numbers for all tasks of a customer here.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {Object.entries(getGroupedSelectedCustomers()).map(([customerId, groupTasks]) => {
                            const representative = groupTasks[0];
                            const templateToUse = templates.find(t => t.id.toString() === selectedTemplate);
                            const content = useCustomMessage
                                ? customMessage
                                : (templateToUse ? replaceTemplateVariables(templateToUse.content, representative) : "");

                            return (
                                <div key={customerId} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-semibold">{representative.name}</h4>
                                            <p className="text-sm text-muted-foreground">{groupTasks.length} task(s) selected</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs">Send to:</Label>
                                            <Select
                                                value={representative.selectedPhone}
                                                onValueChange={(val) => handleUpdateCustomerPhone(customerId, val)}
                                            >
                                                <SelectTrigger className="w-[180px] h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {representative.phoneNumbers.map((phone, idx) => (
                                                        <SelectItem key={idx} value={phone}>{phone}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="bg-muted p-3 rounded text-sm relative">
                                        <div className="absolute top-1 right-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Preview (1 of {groupTasks.length})</div>
                                        {content || <span className="text-muted-foreground italic">No content...</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPreviewModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmSend} disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                            Confirm & Send ({selectedCustomers.length})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Phone Number Management Dialog */}
            <Dialog open={!!managementTarget} onOpenChange={(open) => !open && setManagementTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Phone Number</DialogTitle>
                        <DialogDescription>
                            Select which number to use for {managementTarget?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        {managementTarget?.phoneNumbers.map((phone, idx) => (
                            <div
                                key={idx}
                                className={`flex items-center justify-between p-3 rounded border cursor-pointer hover:bg-muted ${managementTarget.selectedPhone === phone ? 'border-primary bg-primary/5' : ''}`}
                                onClick={() => {
                                    // Update both the displayed customer and stored data
                                    if (selectedCustomersData.has(managementTarget.taskId)) {
                                        setSelectedCustomersData(prev => {
                                            const newMap = new Map(prev);
                                            newMap.set(managementTarget.taskId, { ...managementTarget, selectedPhone: phone });
                                            return newMap;
                                        });
                                    }
                                    setManagementTarget(null);
                                }}
                            >
                                <span className="font-medium">{phone}</span>
                                {managementTarget.selectedPhone === phone && <Badge>Selected</Badge>}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
