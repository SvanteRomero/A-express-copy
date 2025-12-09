'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Label } from "@/components/ui/core/label"
import { User, Phone } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { updateTask } from "@/lib/api-client"
import { useTask } from "@/hooks/use-data"
import { useMutation, useQueryClient } from "@tanstack/react-query"

interface CustomerInformationProps {
  taskId: string
}

export default function CustomerInformation({ taskId }: CustomerInformationProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: taskData, isLoading, isError, error } = useTask(taskId)

  const updateTaskMutation = useMutation({
    mutationFn: (updates: { [key: string]: any }) => updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] })
    },
  })

  const handleFieldUpdate = async (field: string, value: any) => {
    if (["name", "phone_numbers"].includes(field)) {
      updateTaskMutation.mutate({ customer: { [field]: value } })
    } else {
      updateTaskMutation.mutate({ [field]: value })
    }
  }

  const isAdmin = user?.role === "Administrator"
  const isManager = user?.role === "Manager"
  const isFrontDesk = user?.role === "Front Desk"
  const canEditCustomer = isAdmin || isManager || isFrontDesk

  if (isLoading) {
    return <div>Loading customer information...</div>
  }

  if (isError) {
    return <div>Error loading customer information.</div>
  }

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5 text-red-600" />
            Customer Information
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-gray-600">Customer Name</Label>
            <Input
              value={taskData.customer_details?.name || ""}
              onChange={e => handleFieldUpdate("name", e.target.value)}
              className="mt-1"
              disabled={!canEditCustomer}
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Referred By</Label>
            <div className="flex items-center gap-2 mt-1">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900">{taskData.referred_by || "Not referred"}</span>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Phone Numbers</Label>
            {taskData.customer_details?.phone_numbers.map((phone, index) => (
              <div key={index} className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-gray-400" />
                <Input
                  value={phone.phone_number || ""}
                  onChange={e => {
                    const newPhoneNumbers = [...taskData.customer_details.phone_numbers]
                    newPhoneNumbers[index] = { ...newPhoneNumbers[index], phone_number: e.target.value }
                    handleFieldUpdate("phone_numbers", newPhoneNumbers)
                  }}
                  disabled={!canEditCustomer}
                />
                {canEditCustomer && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPhoneNumbers = [...taskData.customer_details.phone_numbers]
                      newPhoneNumbers.splice(index, 1)
                      handleFieldUpdate("phone_numbers", newPhoneNumbers)
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {canEditCustomer && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  const newPhoneNumbers = [...taskData.customer_details.phone_numbers, { phone_number: "" }]
                  handleFieldUpdate("phone_numbers", newPhoneNumbers)
                }}
              >
                Add Phone Number
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}