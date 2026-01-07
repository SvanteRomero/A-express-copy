'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table"
import { Plus } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { addTaskPayment } from "@/lib/api-client"
import { useTask } from "@/hooks/use-tasks"
import { usePaymentMethods } from "@/hooks/use-payments"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { CostBreakdown } from "@/components/tasks/task_details/main/cost-breakdown"
import { CurrencyInput } from "@/components/ui/core/currency-input"
import { AddExpenditureDialog } from "@/components/financials/add-expenditure-dialog"

interface FinancialsProps {
  taskId: string
}

export default function Financials({ taskId }: FinancialsProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: taskData, isLoading, isError, error } = useTask(taskId)
  const { data: paymentMethods } = usePaymentMethods()
  const { toast } = useToast()

  const [newPaymentAmount, setNewPaymentAmount] = useState<number | "">("")
  const [newPaymentMethod, setNewPaymentMethod] = useState("")
  const [isAddExpenditureOpen, setIsAddExpenditureOpen] = useState(false)

  const addTaskPaymentMutation = useMutation({
    mutationFn: (data: any) => addTaskPayment(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })

  const handleAddPayment = async () => {
    if (!newPaymentAmount || !newPaymentMethod || !taskData) return

    const totalCost = parseFloat(taskData.total_cost || "0")
    const paidAmount = taskData.payments.reduce((acc: any, p: any) => acc + parseFloat(p.amount), 0)
    const remainingAmount = totalCost - paidAmount

    if (parseFloat(newPaymentAmount.toString()) > remainingAmount) {
      toast({
        title: "Payment Exceeds Total Cost",
        description: "The payment amount cannot be more than the remaining amount.",
        variant: "destructive",
      })
      return
    }

    addTaskPaymentMutation.mutate({
      amount: newPaymentAmount,
      method: parseInt(newPaymentMethod, 10),
      date: new Date().toISOString().split("T")[0],
    })
    setNewPaymentAmount("")
    setNewPaymentMethod("")
  }

  const isAdmin = user?.role === "Administrator"
  const isManager = user?.role === "Manager"
  const isAccountant = user?.role === "Accountant"
  const canEditFinancials = isAdmin || isManager || isAccountant

  if (isLoading) {
    return <div>Loading financials...</div>
  }

  if (isError) {
    return <div>Error loading financials.</div>
  }
  if (!taskData) {
    return <div>No task data found.</div>
  }


  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-1">
        <CostBreakdown task={taskData} />
      </div>

      <Card className="border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-900">Payment History</CardTitle>
            {canEditFinancials && (
              <div className="flex items-center gap-2">
                <CurrencyInput
                  placeholder="Amount"
                  value={newPaymentAmount}
                  onValueChange={value => setNewPaymentAmount(value || "")}
                  className="w-24"
                />
                <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods?.map(method => (
                      <SelectItem key={method.id} value={String(method.id)}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddPayment}
                  disabled={!newPaymentAmount || !newPaymentMethod}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Payment
                </Button>
                {isAccountant && (
                  <Button
                    onClick={() => setIsAddExpenditureOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Refund
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskData.payments.map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium text-green-600">TSh {parseFloat(payment.amount).toFixed(2)}</TableCell>
                  <TableCell>{payment.date}</TableCell>
                  <TableCell>{payment.method_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {taskData.payments.length === 0 && (
            <div className="text-center py-8 text-gray-500">No payments recorded yet</div>
          )}
        </CardContent>
      </Card>
      <AddExpenditureDialog
        isOpen={isAddExpenditureOpen}
        onClose={() => setIsAddExpenditureOpen(false)}
        mode="refund"
        taskId={taskId}
        taskTitle={taskData.title}
      />
    </div>
  )
}