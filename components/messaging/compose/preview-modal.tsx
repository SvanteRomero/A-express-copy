"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/feedback/dialog";
import { Button } from "@/components/ui/core/button";
import { Label } from "@/components/ui/core/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select";
import { Phone, Loader2 } from "lucide-react";
import { Customer, MessageTemplate } from "../types";
import { replaceTemplateVariables } from "../utils";

interface PreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupedCustomers: Record<string, Customer[]>;
    templates: MessageTemplate[];
    selectedTemplate: string;
    useCustomMessage: boolean;
    customMessage: string;
    onUpdateCustomerPhone: (customerId: string, phone: string) => void;
    onConfirm: () => void;
    loading: boolean;
    totalCount: number;
}

export function PreviewModal({
    open,
    onOpenChange,
    groupedCustomers,
    templates,
    selectedTemplate,
    useCustomMessage,
    customMessage,
    onUpdateCustomerPhone,
    onConfirm,
    loading,
    totalCount,
}: PreviewModalProps) {
    const templateToUse = templates.find(t => t.id.toString() === selectedTemplate);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Confirm Bulk Send</DialogTitle>
                    <DialogDescription>
                        Review messages and confirm recipients. You can update phone numbers for all tasks of a customer here.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {Object.entries(groupedCustomers).map(([customerId, groupTasks]) => {
                        const representative = groupTasks[0];
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
                                            onValueChange={(val) => onUpdateCustomerPhone(customerId, val)}
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
                                    <div className="absolute top-1 right-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Preview (1 of {groupTasks.length})
                                    </div>
                                    {content || <span className="text-muted-foreground italic">No content...</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={onConfirm} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                        Confirm & Send ({totalCount})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
