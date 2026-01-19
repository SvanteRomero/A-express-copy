"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/feedback/dialog";
import { Button } from "@/components/ui/core/button";
import { Label } from "@/components/ui/core/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select";
import { Phone, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { MessageTemplate, TaskForMessaging } from "../types";
import { replaceTemplateVariables } from "../utils";
import { WorkshopStatusBadge } from "@/components/tasks/task_utils/task-badges";

interface SelectedCustomerData {
    customerId: number;
    name: string;
    phone: string;
    phoneNumbers?: string[];
    tasks: TaskForMessaging[];
}

interface PreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedData: SelectedCustomerData[];
    templates: MessageTemplate[];
    selectedTemplate: string;
    useCustomMessage: boolean;
    customMessage: string;
    onUpdateCustomerPhone: (customerId: number, phone: string) => void;
    onConfirm: () => void;
    loading: boolean;
    totalCount: number;
}

// Helper to convert TaskForMessaging to the format expected by replaceTemplateVariables
function taskToCustomerFormat(task: TaskForMessaging, customerName: string) {
    const daysWaiting = task.createdAt
        ? Math.floor((Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return {
        id: task.id.toString(),
        taskId: task.taskId,
        taskDisplayId: task.taskDisplayId,
        customerId: '',
        name: customerName,
        phone: '',
        phoneNumbers: [],
        selectedPhone: '',
        device: task.device,
        description: task.description,
        deviceNotes: task.deviceNotes,
        status: task.status,
        workshopStatus: task.workshopStatus,
        amount: task.amount,
        outstandingBalance: task.outstandingBalance,
        isDebt: task.isDebt,
        daysWaiting,
    };
}

export function PreviewModal({
    open,
    onOpenChange,
    selectedData,
    templates,
    selectedTemplate,
    useCustomMessage,
    customMessage,
    onUpdateCustomerPhone,
    onConfirm,
    loading,
    totalCount,
}: PreviewModalProps) {
    const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());

    const templateToUse = templates.find(t =>
        (t.key && t.key === selectedTemplate) ||
        (t.id && t.id.toString() === selectedTemplate)
    );

    const toggleExpanded = (customerId: number) => {
        setExpandedCustomers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(customerId)) {
                newSet.delete(customerId);
            } else {
                newSet.add(customerId);
            }
            return newSet;
        });
    };

    // Get preview for a task
    const getMessagePreview = (task: TaskForMessaging, customerName: string) => {
        if (useCustomMessage) {
            return customMessage.replace(/{customer}/g, customerName);
        }
        if (!templateToUse) return "";
        const customerFormat = taskToCustomerFormat(task, customerName);
        return replaceTemplateVariables(templateToUse.content, customerFormat);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Confirm Bulk Send</DialogTitle>
                    <DialogDescription>
                        Review messages before sending. Each customer will receive messages for their selected tasks.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {selectedData.map(customer => {
                        const isExpanded = expandedCustomers.has(customer.customerId);
                        const firstTask = customer.tasks[0];
                        const firstPreview = firstTask ? getMessagePreview(firstTask, customer.name) : "";

                        return (
                            <div key={customer.customerId} className="border rounded-lg p-4 space-y-3">
                                {/* Customer Header */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-semibold">{customer.name}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {customer.tasks.length} message{customer.tasks.length !== 1 ? 's' : ''} will be sent
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs">Send to:</Label>
                                        {customer.phoneNumbers && customer.phoneNumbers.length > 1 ? (
                                            <Select
                                                value={customer.phone}
                                                onValueChange={(val) => onUpdateCustomerPhone(customer.customerId, val)}
                                            >
                                                <SelectTrigger className="h-7 w-[160px] text-xs border border-gray-300 bg-white hover:bg-gray-50">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {customer.phoneNumbers.map((phone, idx) => (
                                                        <SelectItem key={idx} value={phone}>{phone}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <span className="text-sm font-medium">{customer.phone}</span>
                                        )}
                                    </div>
                                </div>

                                {/* First Message Preview (always shown) */}
                                <div className="bg-muted p-3 rounded text-sm relative">
                                    <div className="absolute top-1 right-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Preview (1 of {customer.tasks.length})
                                    </div>
                                    <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                                        <span className="font-medium">{firstTask?.taskDisplayId}</span>
                                        <span>•</span>
                                        <span>{firstTask?.device}</span>
                                        {firstTask?.workshopStatus && (
                                            <>
                                                <span>•</span>
                                                <WorkshopStatusBadge status={firstTask.workshopStatus} />
                                            </>
                                        )}
                                    </div>
                                    {firstPreview || <span className="text-muted-foreground italic">No content...</span>}
                                </div>

                                {/* Expand/Collapse for multiple tasks */}
                                {customer.tasks.length > 1 && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleExpanded(customer.customerId)}
                                            className="w-full justify-center text-xs"
                                        >
                                            {isExpanded ? (
                                                <>
                                                    <ChevronUp className="h-3 w-3 mr-1" />
                                                    Hide other {customer.tasks.length - 1} messages
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-3 w-3 mr-1" />
                                                    Show all {customer.tasks.length} messages
                                                </>
                                            )}
                                        </Button>

                                        {/* Expanded task previews */}
                                        {isExpanded && (
                                            <div className="space-y-2">
                                                {customer.tasks.slice(1).map((task, idx) => {
                                                    const preview = getMessagePreview(task, customer.name);
                                                    return (
                                                        <div key={task.taskId} className="bg-muted/50 p-3 rounded text-sm">
                                                            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                                                                <span className="font-medium">{task.taskDisplayId}</span>
                                                                <span>•</span>
                                                                <span>{task.device}</span>
                                                                {task.workshopStatus && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <WorkshopStatusBadge status={task.workshopStatus} />
                                                                    </>
                                                                )}
                                                            </div>
                                                            {preview || <span className="text-muted-foreground italic">No content...</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={onConfirm} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                        Confirm & Send ({totalCount} messages)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
