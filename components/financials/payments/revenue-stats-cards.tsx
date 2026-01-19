'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { CardGridSkeleton } from "@/components/ui/core/loaders"

interface RevenueData {
    opening_balance?: number;
    today_revenue: number;
    day_over_day_change: number;
    today_expenditure?: number;
    expenditure_day_over_day_change?: number;
}

interface RevenueStatsCardsProps {
    revenueData?: RevenueData;
    isLoading: boolean;
    isError: boolean;
    formatCurrency: (amount: number) => string;
}

export function RevenueStatsCards({
    revenueData,
    isLoading,
    isError,
    formatCurrency,
}: RevenueStatsCardsProps) {
    if (isError) {
        return (
            <div className='grid gap-4 md:grid-cols-3 lg:grid-cols-3'>
                <div>Failed to load revenue data</div>
            </div>
        );
    }

    if (isLoading || !revenueData) {
        return <CardGridSkeleton cards={3} columns={3} />;
    }

    return (
        <div className='grid gap-4 md:grid-cols-3 lg:grid-cols-3'>
            {revenueData.opening_balance !== undefined && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(revenueData.opening_balance)}</div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                    {revenueData.day_over_day_change >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(revenueData.today_revenue)}</div>
                    <p className="text-xs text-muted-foreground">
                        {revenueData.day_over_day_change.toFixed(2)}% from yesterday
                    </p>
                </CardContent>
            </Card>

            {revenueData.today_expenditure !== undefined && revenueData.expenditure_day_over_day_change !== undefined && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Expenditure</CardTitle>
                        {revenueData.expenditure_day_over_day_change >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(revenueData.today_expenditure)}</div>
                        <p className="text-xs text-muted-foreground">
                            {revenueData.expenditure_day_over_day_change.toFixed(2)}% from yesterday
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
