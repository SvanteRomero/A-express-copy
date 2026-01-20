'use client'

import { Input } from "@/components/ui/core/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"

interface PaymentMethod {
    id: number;
    name: string;
}

interface PaymentCategory {
    id: number;
    name: string;
}

interface PaymentFiltersToolbarProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    methodFilter: string;
    onMethodFilterChange: (value: string) => void;
    categoryFilter: string;
    onCategoryFilterChange: (value: string) => void;
    paymentMethods?: PaymentMethod[];
    paymentCategories?: PaymentCategory[];
    isMobile: boolean;
}

export function PaymentFiltersToolbar({
    searchTerm,
    onSearchChange,
    methodFilter,
    onMethodFilterChange,
    categoryFilter,
    onCategoryFilterChange,
    paymentMethods,
    paymentCategories,
    isMobile,
}: PaymentFiltersToolbarProps) {
    return (
        <div className={`flex ${isMobile ? 'flex-col gap-2 w-full' : 'flex-row items-center gap-3'}`}>
            <Input
                placeholder="Search by description..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className={isMobile ? "w-full" : "flex-1"}
            />

            <Select value={methodFilter} onValueChange={onMethodFilterChange}>
                <SelectTrigger className={isMobile ? "w-full" : "w-[150px]"}>
                    <SelectValue placeholder='Method' />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='all'>All Methods</SelectItem>
                    {paymentMethods?.map((method) => (
                        <SelectItem key={method.id} value={method.name}>{method.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
                <SelectTrigger className={isMobile ? "w-full" : "w-[150px]"}>
                    <SelectValue placeholder='Category' />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='all'>All Categories</SelectItem>
                    {paymentCategories?.map((category) => (
                        <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
