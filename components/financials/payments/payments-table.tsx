'use client'

import { Card, CardContent, CardHeader } from "@/components/ui/layout/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Button } from "@/components/ui/core/button"
import { Badge } from "@/components/ui/core/badge"
import { cn } from "@/lib/utils"

interface Payment {
    id: any;
    task: number;
    task_status: string;
    amount: string;
    date: string;
    method: number;
    method_name: string;
    description: string;
    category_name: string;
}

interface PaymentsTableProps {
    payments: Payment[];
    isLoading: boolean;
    isMobile: boolean;
    page: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    onPageChange: (page: number) => void;
    formatCurrency: (amount: number) => string;
}

export function PaymentsTable({
    payments,
    isLoading,
    isMobile,
    page,
    hasNextPage,
    hasPreviousPage,
    onPageChange,
    formatCurrency,
}: PaymentsTableProps) {
    if (isMobile) {
        return (
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-4">Loading...</div>
                ) : payments?.map((payment: Payment) => (
                    <Card key={payment.id}>
                        <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold">{payment.description}</div>
                                    <div className="text-xs text-muted-foreground">{payment.date}</div>
                                </div>
                                <div className={cn("font-bold", parseFloat(payment.amount) > 0 ? 'text-green-600' : 'text-red-600')}>
                                    {formatCurrency(parseFloat(payment.amount))}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2">
                            <div className="flex justify-between items-center text-sm border-t pt-2 mt-2">
                                <Badge variant="secondary">{payment.method_name}</Badge>
                                <span className="text-muted-foreground">{payment.category_name}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                <div className="flex justify-center space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(Math.max(1, page - 1))}
                        disabled={!hasPreviousPage || isLoading}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page + 1)}
                        disabled={!hasNextPage || isLoading}
                    >
                        Next
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className='rounded-md border'>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                        </TableRow>
                    ) : payments?.map((payment: Payment) => (
                        <TableRow key={payment.id}>
                            <TableCell>{payment.description}</TableCell>
                            <TableCell
                                className={parseFloat(payment.amount) > 0 ? 'text-green-600' : 'text-red-600'}
                            >
                                {formatCurrency(parseFloat(payment.amount))}
                            </TableCell>
                            <TableCell>{payment.method_name}</TableCell>
                            <TableCell>{payment.category_name}</TableCell>
                            <TableCell>{payment.date}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div className="flex justify-end space-x-2 p-4">
                <Button
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={!hasPreviousPage || isLoading}
                >
                    Previous
                </Button>
                <Button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!hasNextPage || isLoading}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
