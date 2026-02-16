'use client'

import { useState } from "react"
import { Plus, Download, DollarSign, MinusCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { usePayments, usePaymentMethods, usePaymentCategories, useRevenueOverview } from "@/hooks/use-payments"
import { useAuth } from "@/hooks/use-auth"
import { AddTransactionDialog } from "../add-transaction-dialog"
import { RequestsList } from "../requests-list"
import { FinancialSummaryPreview } from "./financial-summary-preview"
import { PaymentsTable } from "./payments-table"
import { RevenueStatsCards } from "./revenue-stats-cards"
import { PaymentFiltersToolbar } from "./payment-filters-toolbar"

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

type TransactionType = 'Expenditure' | 'Revenue';

interface TransactionDialogState {
  isOpen: boolean;
  type: TransactionType;
}

export function PaymentsOverview() {
  const [methodFilter, setMethodFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("revenue")
  const [searchTerm, setSearchTerm] = useState("")
  const [transactionDialog, setTransactionDialog] = useState<TransactionDialogState>({
    isOpen: false,
    type: 'Expenditure'
  })
  const [isFinancialSummaryOpen, setIsFinancialSummaryOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const isMobile = useIsMobile()

  const { user } = useAuth()
  const isManager = user?.role === 'Manager'
  const isAccountant = user?.role === 'Accountant'
  const canAddTransactions = isAccountant || isManager

  // Data fetching with React Query
  const { data: paymentsData, isLoading, isError } = usePayments({
    method: methodFilter,
    category: categoryFilter,
    is_refunded: activeTab === "expenditure",
    search: searchTerm,
    page: page,
    page_size: pageSize,
  })

  const { data: revenueData, isLoading: isLoadingRevenue, isError: isRevenueError } = useRevenueOverview()
  const { data: paymentMethods } = usePaymentMethods()
  const { data: paymentCategories } = usePaymentCategories()

  const payments = paymentsData?.results || []
  const hasNextPage = !!paymentsData?.next
  const hasPreviousPage = !!paymentsData?.previous

  const revenuePayments = activeTab === 'revenue' ? payments : []
  const expenditurePayments = activeTab === 'expenditure' ? payments : []

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS' }).format(amount)
  }

  const openTransactionDialog = (type: TransactionType) => {
    setTransactionDialog({ isOpen: true, type })
  }

  const closeTransactionDialog = () => {
    setTransactionDialog({ ...transactionDialog, isOpen: false })
  }

  if (isError) return <div>Error fetching payments.</div>

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Payments</h1>
          <p className='text-muted-foreground'>Manage and track all payment transactions</p>
        </div>
        <div className="flex items-center space-x-2">
          {canAddTransactions && (
            <>
              <Button
                variant="outline"
                onClick={() => openTransactionDialog('Revenue')}
                className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
              >
                <DollarSign className='mr-2 h-4 w-4' />
                Add Revenue
              </Button>
              <Button onClick={() => openTransactionDialog('Expenditure')}>
                <MinusCircle className='mr-2 h-4 w-4' />
                Add Expenditure
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setIsFinancialSummaryOpen(true)}>
            <Download className='mr-2 h-4 w-4' />
            Export
          </Button>
        </div>
      </div>

      {/* Revenue Statistics */}
      <RevenueStatsCards
        revenueData={revenueData}
        isLoading={isLoadingRevenue}
        isError={isRevenueError}
        formatCurrency={formatCurrency}
      />

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>View and manage all payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='revenue' onValueChange={setActiveTab} className='space-y-4'>
            <TabsList className={`grid w-full ${canAddTransactions ? 'grid-cols-3' : 'grid-cols-2'} bg-gray-100`}>
              <TabsTrigger value='revenue' className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Revenue</TabsTrigger>
              <TabsTrigger value='expenditure' className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Expenditure</TabsTrigger>
              {canAddTransactions && <TabsTrigger value='requests' className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Requests</TabsTrigger>}
            </TabsList>

            {activeTab !== 'requests' && (
              <PaymentFiltersToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                methodFilter={methodFilter}
                onMethodFilterChange={setMethodFilter}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                onClearFilters={() => {
                  setSearchTerm('');
                  setMethodFilter('all');
                  setCategoryFilter('all');
                }}
                paymentMethods={paymentMethods}
                paymentCategories={paymentCategories}
                isMobile={isMobile}
              />
            )}

            <TabsContent value='revenue'>
              <PaymentsTable
                payments={revenuePayments}
                isLoading={isLoading}
                isMobile={isMobile}
                page={page}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                onPageChange={setPage}
                formatCurrency={formatCurrency}
              />
            </TabsContent>

            <TabsContent value='expenditure'>
              <PaymentsTable
                payments={expenditurePayments}
                isLoading={isLoading}
                isMobile={isMobile}
                page={page}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                onPageChange={setPage}
                formatCurrency={formatCurrency}
              />
            </TabsContent>

            {canAddTransactions && (
              <TabsContent value='requests'>
                <RequestsList />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <FinancialSummaryPreview
        isOpen={isFinancialSummaryOpen}
        onClose={() => setIsFinancialSummaryOpen(false)}
        openingBalance={revenueData?.opening_balance}
      />
      <AddTransactionDialog
        isOpen={transactionDialog.isOpen}
        onClose={closeTransactionDialog}
        defaultType={transactionDialog.type}
      />
    </div>
  )
}
