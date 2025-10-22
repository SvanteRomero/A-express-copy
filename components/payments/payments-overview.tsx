'use client'

import { useState } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Plus, Download, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/layout/popover"
import { Calendar } from "@/components/ui/core/calendar"
import { Input } from "@/components/ui/core/input";
import { usePayments } from "@/hooks/use-payments"
import { usePaymentMethods } from "@/hooks/use-payment-methods"
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils"
import { AddExpenditureDialog } from "../financials/add-expenditure-dialog";
import { ExpenditureRequestsList } from "../financials/expenditure-requests-list";
import useSWR from 'swr'
import { apiClient } from "@/lib/api-client"

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

const fetcher = (url: string) => apiClient.get(url).then(res => res.data)

export function PaymentsOverview() {
  const [methodFilter, setMethodFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("revenue")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddExpenditureOpen, setIsAddExpenditureOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10; // Or a configurable value

  const { user } = useAuth();
  const isManager = user?.role === 'Manager';
  const isAccountant = user?.role === 'Accountant';

  const { data: paymentsData, isLoading, isError } = usePayments({
    method: methodFilter,
    category: categoryFilter,
    is_refunded: activeTab === "expenditure",
    date: date ? format(date, "yyyy-MM-dd") : undefined,
    search: searchTerm,
    page: page,
    page_size: pageSize,
  });

  const payments = paymentsData?.results || [];
  const hasNextPage = !!paymentsData?.next;
  const hasPreviousPage = !!paymentsData?.previous;

  const { data: revenueData, error: revenueError } = useSWR('/revenue-overview/', fetcher)
  const { data: paymentMethods } = usePaymentMethods()
  const { data: paymentCategories } = useSWR('/payment-categories/', fetcher)

  const revenuePayments = activeTab === 'revenue' ? payments.filter((p: Payment) => parseFloat(p.amount) > 0) : [];
  const expenditurePayments = activeTab === 'expenditure' ? payments : [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS' }).format(amount)
  }

  const renderPaymentsTable = (paymentsToRender: Payment[]) => (
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
          ) : paymentsToRender?.map((payment: Payment) => (
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
          onClick={() => setPage(prev => Math.max(1, prev - 1))}
          disabled={!hasPreviousPage || isLoading}
        >
          Previous
        </Button>
        <Button
          onClick={() => setPage(prev => prev + 1)}
          disabled={!hasNextPage || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  );

  if (isError) return <div>Error fetching payments.</div>

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Payments</h1>
          <p className='text-muted-foreground'>Manage and track all payment transactions</p>
        </div>
        <div className="flex items-center space-x-2">
          {(isAccountant || isManager) && (
            <Button onClick={() => setIsAddExpenditureOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add Expenditure
            </Button>
          )}
          <Button>
            <Download className='mr-2 h-4 w-4' />
            Export Report
          </Button>
        </div>
      </div>

      {/* Payment Statistics */}
      <div className='grid gap-4 md:grid-cols-3 lg:grid-cols-3'>
        {revenueError ? <div>Failed to load revenue data</div> : !revenueData ? <div>Loading...</div> : (
          <>
            {revenueData && revenueData.opening_balance !== undefined && (
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
                {revenueData.day_over_day_change >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(revenueData.today_revenue)}</div>
                <p className="text-xs text-muted-foreground">{revenueData.day_over_day_change.toFixed(2)}% from yesterday</p>
              </CardContent>
            </Card>
            {revenueData.today_expenditure !== undefined && revenueData.expenditure_day_over_day_change !== undefined && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Expenditure</CardTitle>
                  {revenueData.expenditure_day_over_day_change >= 0 ? <TrendingUp className="h-4 w-4 text-red-500" /> : <TrendingDown className="h-4 w-4 text-green-500" />}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenueData.today_expenditure)}</div>
                  <p className="text-xs text-muted-foreground">{revenueData.expenditure_day_over_day_change.toFixed(2)}% from yesterday</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>View and manage all payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='revenue' onValueChange={setActiveTab} className='space-y-4'>
            <div className='flex items-center justify-between'>
              <TabsList>
                <TabsTrigger value='revenue'>Revenue</TabsTrigger>
                <TabsTrigger value='expenditure'>Expenditure</TabsTrigger>
                {(isManager || isAccountant) && <TabsTrigger value='requests'>Requests</TabsTrigger>}
              </TabsList>

              {activeTab !== 'requests' && (
                <div className='flex items-center space-x-2'>
                  <Input
                    placeholder="Search by description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-[200px]"
                  />
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className='w-[140px]'><SelectValue placeholder='Method' /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Methods</SelectItem>
                      {paymentMethods?.map((method) => (
                        <SelectItem key={method.id} value={method.name}>{method.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className='w-[140px]'><SelectValue placeholder='Category' /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Categories</SelectItem>
                      {paymentCategories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-[280px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <TabsContent value='revenue'>
              {renderPaymentsTable(revenuePayments)}
            </TabsContent>
            <TabsContent value='expenditure'>
              {renderPaymentsTable(expenditurePayments)}
            </TabsContent>
            <TabsContent value='requests'>
              <ExpenditureRequestsList />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <AddExpenditureDialog isOpen={isAddExpenditureOpen} onClose={() => setIsAddExpenditureOpen(false)} />
    </div>
  )
}