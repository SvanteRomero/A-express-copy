'use client'

import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Input } from "@/components/ui/core/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/layout/popover"
import { Calendar } from "@/components/ui/core/calendar"
import { Button } from "@/components/ui/core/button"
import { cn } from "@/lib/utils"

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
    date: Date | undefined;
    onDateChange: (date: Date | undefined) => void;
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
    date,
    onDateChange,
    paymentMethods,
    paymentCategories,
    isMobile,
}: PaymentFiltersToolbarProps) {
    return (
        <div className={`flex ${isMobile ? 'flex-col gap-2 w-full mt-4' : 'items-center space-x-2'}`}>
            <Input
                placeholder="Search by description..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className={isMobile ? "w-full" : "w-[200px]"}
            />

            <Select value={methodFilter} onValueChange={onMethodFilterChange}>
                <SelectTrigger className={isMobile ? "w-full" : "w-[140px]"}>
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
                <SelectTrigger className={isMobile ? "w-full" : "w-[140px]"}>
                    <SelectValue placeholder='Category' />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='all'>All Categories</SelectItem>
                    {paymentCategories?.map((category) => (
                        <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "justify-start text-left font-normal",
                            !date && "text-muted-foreground",
                            isMobile ? "w-full" : "w-[280px]"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={onDateChange} initialFocus />
                </PopoverContent>
            </Popover>
        </div>
    );
}
