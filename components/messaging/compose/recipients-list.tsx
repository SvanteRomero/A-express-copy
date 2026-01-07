"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/core/button";
import { Input } from "@/components/ui/core/input";
import { Label } from "@/components/ui/core/label";
import { Checkbox } from "@/components/ui/core/checkbox";
import { Badge } from "@/components/ui/core/badge";
import { StatusBadge, WorkshopStatusBadge } from "@/components/tasks/task_utils/task-badges";
import { Search, Phone, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Customer } from "../types";

interface RecipientsListProps {
    customers: Customer[];
    selectedTaskIds: Set<number>;
    selectedCount: number;
    onToggleCustomer: (customer: Customer) => void;
    canSelect: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    isLoading: boolean;
    currentPage: number;
    totalPages: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    onManagePhone: (customer: Customer) => void;
    onSendClick: () => void;
    isSending: boolean;
}

export function RecipientsList({
    customers,
    selectedTaskIds,
    selectedCount,
    onToggleCustomer,
    canSelect,
    searchQuery,
    onSearchChange,
    isLoading,
    currentPage,
    totalPages,
    totalCount,
    onPageChange,
    onManagePhone,
    onSendClick,
    isSending,
}: RecipientsListProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Recipients ({selectedCount})</CardTitle>
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
                        placeholder="Search recipients..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading recipients...</div>
                    ) : customers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No customers found matching your search.</div>
                    ) : (
                        customers.map(customer => {
                            const isSelected = selectedTaskIds.has(customer.taskId);
                            return (
                                <div
                                    key={customer.id}
                                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'} ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Checkbox
                                        id={`c-${customer.id}`}
                                        checked={isSelected}
                                        onCheckedChange={() => canSelect && onToggleCustomer(customer)}
                                        disabled={!canSelect}
                                        className="mt-1"
                                    />
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <Label
                                                htmlFor={`c-${customer.id}`}
                                                className={`font-medium ${canSelect ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                            >
                                                {customer.name}
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                {customer.isDebt && <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">Debt</Badge>}
                                                <StatusBadge status={customer.status} />
                                                {customer.workshopStatus && <WorkshopStatusBadge status={customer.workshopStatus} />}
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
                                                        onManagePhone(customer);
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
                            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                            disabled={currentPage === 1 || isLoading}
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
