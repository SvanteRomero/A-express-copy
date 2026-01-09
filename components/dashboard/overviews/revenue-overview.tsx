
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import useSWR from 'swr'
import { apiClient } from "@/lib/api-client"
import { CardGridSkeleton } from "@/components/ui/core/loaders"

const fetcher = (url: string) => apiClient.get(url).then(res => res.data)

interface RevenueOverviewProps {
  variant?: 'today' | 'month' | 'all';
}

export function RevenueOverview({ variant = 'all' }: RevenueOverviewProps) {
  const { data, error } = useSWR('/revenue-overview/', fetcher)

  if (error) return <div>Failed to load revenue data</div>
  if (!data) return <CardGridSkeleton cards={2} columns={2} />

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'TZS',
    }).format(amount)
  }

  return (
    <div className={variant === 'all' ? "grid gap-4 md:grid-cols-2" : ""}>
      {(variant === 'all' || variant === 'month') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue this month</CardTitle>
            {data.month_over_month_change >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.this_month_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              {(data.month_over_month_change ?? 0).toFixed(2)}% from last month
            </p>
          </CardContent>
        </Card>
      )}
      {(variant === 'all' || variant === 'today') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            {data.day_over_day_change >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.today_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              {data.day_over_day_change.toFixed(2)}% from yesterday
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
