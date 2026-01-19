"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/core/button";
import { Input } from "@/components/ui/core/input";
import { Checkbox } from "@/components/ui/core/checkbox";
import { Badge } from "@/components/ui/core/badge";
import { StatusBadge, WorkshopStatusBadge } from "@/components/tasks/task_utils/task-badges";
import { Search, Phone, Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { CustomerForMessaging, TaskForMessaging } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select";

interface RecipientsListProps {
    customers: CustomerForMessaging[];
    selectedTaskIds: Set<number>;
    selectedCount: number;
    onToggleTask: (customerId: number, task: TaskForMessaging) => void;
    onToggleAllForCustomer: (customer: CustomerForMessaging) => void;
    isTaskSelected: (taskId: number) => boolean;
    isCustomerFullySelected: (customer: CustomerForMessaging) => boolean;
    isCustomerPartiallySelected: (customer: CustomerForMessaging) => boolean;
    canSelect: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    isLoading: boolean;
    currentPage: number;
    totalPages: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    onSendClick: () => void;
    isSending: boolean;
    getCustomerPhone: (customerId: number) => string;
    onUpdateCustomerPhone: (customerId: number, phone: string) => void;
    isBroadcastMode?: boolean;
}

export function RecipientsList({
    customers,
    selectedTaskIds,
    selectedCount,
    onToggleTask,
    onToggleAllForCustomer,
    isTaskSelected,
    isCustomerFullySelected,
    isCustomerPartiallySelected,
    canSelect,
    searchQuery,
    onSearchChange,
    isLoading,
    currentPage,
    totalPages,
    totalCount,
    onPageChange,
    onSendClick,
    isSending,
    getCustomerPhone,
    onUpdateCustomerPhone,
    isBroadcastMode = false,
}: RecipientsListProps) {
    const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());

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

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>
                        Recipients ({isBroadcastMode ? `${selectedCount} selected` : `${selectedCount} tasks selected`})
                    </CardTitle>
                    <Button onClick={onSendClick} disabled={isSending || selectedCount === 0}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                        Send Bulk SMS
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search customers..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                </div>

                <div className="space-y-2 pr-2">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading customers...</div>
                    ) : customers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {canSelect ? "No customers found matching your search." : "Please select a template first."}
                        </div>
                    ) : (
                        customers.map(customer => {
                            const isExpanded = expandedCustomers.has(customer.customerId);
                            const isFullySelected = isCustomerFullySelected(customer);
                            const isPartiallySelected = isCustomerPartiallySelected(customer);
                            const selectedPhone = getCustomerPhone(customer.customerId);
                            const hasMultipleTasks = customer.tasks.length > 1;

                            // In broadcast mode, show a simpler, cleaner UI
                            if (isBroadcastMode) {
                                return (
                                    <div
                                        key={customer.customerId}
                                        className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${isFullySelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                                            } ${!canSelect ? 'opacity-50' : ''}`}
                                    >
                                        <Checkbox
                                            id={`customer-${customer.customerId}`}
                                            checked={isFullySelected}
                                            onCheckedChange={() => canSelect && onToggleAllForCustomer(customer)}
                                            disabled={!canSelect}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <span className="font-medium">{customer.name}</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {customer.phoneNumbers.length > 1 ? (
                                                <Select
                                                    value={selectedPhone}
                                                    onValueChange={(val) => onUpdateCustomerPhone(customer.customerId, val)}
                                                >
                                                    <SelectTrigger className="h-7 w-[150px] text-xs border border-gray-300 bg-white hover:bg-gray-50">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {customer.phoneNumbers.map((phone, idx) => (
                                                            <SelectItem key={idx} value={phone}>{phone}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <span className="text-xs">{selectedPhone || "No phone"}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            // Non-broadcast mode: show full task details
                            return (
                                <div
                                    key={customer.customerId}
                                    className={`border rounded-lg transition-colors ${isFullySelected ? 'bg-primary/5 border-primary' :
                                        isPartiallySelected ? 'bg-primary/3 border-primary/50' : 'hover:bg-muted/50'
                                        } ${!canSelect ? 'opacity-50' : ''}`}
                                >
                                    {/* Customer Header */}
                                    <div className="p-3 flex items-center gap-3">
                                        <Checkbox
                                            id={`customer-${customer.customerId}`}
                                            checked={isFullySelected}
                                            data-state={isPartiallySelected ? "indeterminate" : isFullySelected ? "checked" : "unchecked"}
                                            onCheckedChange={() => canSelect && onToggleAllForCustomer(customer)}
                                            disabled={!canSelect}
                                            className={isPartiallySelected ? "data-[state=indeterminate]:bg-primary/50" : ""}
                                        />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium truncate">{customer.name}</span>
                                                <Badge className="text-xs bg-blue-500 hover:bg-blue-600 text-white">
                                                    {customer.tasks.length} task{customer.tasks.length !== 1 ? 's' : ''}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                                {customer.phoneNumbers.length > 1 ? (
                                                    <Select
                                                        value={selectedPhone}
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
                                                    <span>{selectedPhone || "No phone"}</span>
                                                )}
                                            </div>
                                        </div>

                                        {hasMultipleTasks && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleExpanded(customer.customerId)}
                                                className="h-8 w-8 p-0"
                                            >
                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </Button>
                                        )}
                                    </div>

                                    {/* Expanded Tasks List */}
                                    {isExpanded && hasMultipleTasks && (
                                        <div className="border-t bg-muted/30 px-3 py-2 space-y-2">
                                            {customer.tasks.map(task => {
                                                const taskSelected = isTaskSelected(task.taskId);
                                                return (
                                                    <div
                                                        key={task.taskId}
                                                        className={`flex items-center gap-3 p-2 rounded ${taskSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                                                            }`}
                                                    >
                                                        <Checkbox
                                                            id={`task-${task.taskId}`}
                                                            checked={taskSelected}
                                                            onCheckedChange={() => canSelect && onToggleTask(customer.customerId, task)}
                                                            disabled={!canSelect}
                                                            className="ml-4"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <span className="font-medium">{task.taskDisplayId}</span>
                                                                <span className="text-muted-foreground">•</span>
                                                                <span className="truncate text-muted-foreground">{task.device}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {task.isDebt && <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-xs">Debt</Badge>}
                                                            <StatusBadge status={task.status} />
                                                            {task.workshopStatus && <WorkshopStatusBadge status={task.workshopStatus} />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
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
                            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                            disabled={currentPage === 1 || isLoading}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages} ({totalCount} customers)
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                            disabled={currentPage === totalPages || isLoading}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
