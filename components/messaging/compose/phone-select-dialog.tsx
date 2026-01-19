"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/feedback/dialog";
import { Badge } from "@/components/ui/core/badge";
import { Customer } from "../types";

interface PhoneSelectDialogProps {
    customer: Customer | null;
    onClose: () => void;
    onSelectPhone: (taskId: number, phone: string) => void;
}

export function PhoneSelectDialog({
    customer,
    onClose,
    onSelectPhone,
}: PhoneSelectDialogProps) {
    if (!customer) return null;

    return (
        <Dialog open={!!customer} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select Phone Number</DialogTitle>
                    <DialogDescription>
                        Select which number to use for {customer.name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                    {customer.phoneNumbers.map((phone, idx) => (
                        <div
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded border cursor-pointer hover:bg-muted ${customer.selectedPhone === phone ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => {
                                onSelectPhone(customer.taskId, phone);
                                onClose();
                            }}
                        >
                            <span className="font-medium">{phone}</span>
                            {customer.selectedPhone === phone && <Badge>Selected</Badge>}
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
