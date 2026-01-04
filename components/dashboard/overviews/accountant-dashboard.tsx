"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import {
  Calendar,
  DollarSign,
  FileText,
  CreditCard,
  Banknote,
} from "lucide-react"
import { getAccountantDashboardStats } from "@/lib/api-client"
import { Button } from "@/components/ui/core/button"
import Link from "next/link"

interface DashboardStats {
  todays_revenue: number;
  outstanding_payments_total: number;
  pending_payment_count: number;
}

export default function AccountantDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAccountantDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header Section */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Accountant Dashboard</h2>
        <p className="text-muted-foreground">Financial overview and task management.</p>
      </div>

      {/* Daily Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.todays_revenue !== undefined
                ? new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(stats.todays_revenue)
                : 'TSh 0.00'
              }
            </div>
            <p className="text-xs text-muted-foreground">Total payments received today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Payments</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.outstanding_payments_total !== undefined
                ? new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(stats.outstanding_payments_total)
                : 'TSh 0.00'
              }
            </div>
            <p className="text-xs text-muted-foreground">Total pending from all tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Pending Payment</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_payment_count || 0}</div>
            <p className="text-xs text-muted-foreground">Unpaid or partially paid tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions / Navigation */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Financials
            </CardTitle>
            <CardDescription>View all transactions and payment history.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/payments">View Payments</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Debts
            </CardTitle>
            <CardDescription>Manage outstanding debts and collections.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/debts">View Debts</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Expenditure Requests
            </CardTitle>
            <CardDescription>Review and approve expense requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/expenditure-requests">View Requests</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
