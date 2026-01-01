'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Label } from "@/components/ui/core/label"
import { User, Phone, Pencil, Save, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { updateTask } from "@/lib/api-client"
import { useTask } from "@/hooks/use-data"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"

interface CustomerInformationProps {
  taskId: string
}

interface PhoneNumber {
  id?: number
  phone_number: string
}

export default function CustomerInformation({ taskId }: CustomerInformationProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: taskData, isLoading, isError } = useTask(taskId)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState("")
  const [editedPhoneNumbers, setEditedPhoneNumbers] = useState<PhoneNumber[]>([])

  // Sync local state when taskData changes
  useEffect(() => {
    if (taskData) {
      setEditedName(taskData.customer_details?.name || "")
      setEditedPhoneNumbers(taskData.customer_details?.phone_numbers || [])
    }
  }, [taskData])

  const updateTaskMutation = useMutation({
    mutationFn: (updates: { [key: string]: any }) => updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] })
      setIsEditing(false)
      toast({
        title: "Changes Saved",
        description: "Customer information updated successfully.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      })
    },
  })

  const handleSave = () => {
    updateTaskMutation.mutate({
      customer: {
        name: editedName,
        phone_numbers_write: editedPhoneNumbers,
      },
    })
  }

  const handleCancel = () => {
    // Reset to original data
    setEditedName(taskData?.customer_details?.name || "")
    setEditedPhoneNumbers(taskData?.customer_details?.phone_numbers || [])
    setIsEditing(false)
  }

  const handlePhoneChange = (index: number, value: string) => {
    const updated = [...editedPhoneNumbers]
    updated[index] = { ...updated[index], phone_number: value }
    setEditedPhoneNumbers(updated)
  }

  const handleRemovePhone = (index: number) => {
    const updated = [...editedPhoneNumbers]
    updated.splice(index, 1)
    setEditedPhoneNumbers(updated)
  }

  const handleAddPhone = () => {
    setEditedPhoneNumbers([...editedPhoneNumbers, { phone_number: "" }])
  }

  const isAdmin = user?.role === "Administrator"
  const isManager = user?.role === "Manager"
  const isFrontDesk = user?.role === "Front Desk"
  const canEditCustomer = isAdmin || isManager || isFrontDesk

  if (isLoading) {
    return <div>Loading customer information...</div>
  }

  if (isError || !taskData) {
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
          {canEditCustomer && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateTaskMutation.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleSave}
                disabled={updateTaskMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {updateTaskMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-gray-600">Customer Name</Label>
            {isEditing ? (
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="mt-1"
              />
            ) : (
              <p className="text-gray-900 font-medium mt-1">
                {taskData.customer_details?.name || "N/A"}
              </p>
            )}
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
            {isEditing ? (
              <>
                {editedPhoneNumbers.map((phone, index) => (
                  <div key={index} className="flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <Input
                      value={phone.phone_number || ""}
                      onChange={(e) => handlePhoneChange(index, e.target.value)}
                      placeholder="Enter phone number"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleRemovePhone(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  className="mt-2 bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={handleAddPhone}
                >
                  Add Phone Number
                </Button>
              </>
            ) : (
              <>
                {taskData.customer_details?.phone_numbers?.length > 0 ? (
                  taskData.customer_details.phone_numbers.map((phone: PhoneNumber, index: number) => (
                    <div key={index} className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{phone.phone_number}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 mt-1">No phone numbers</p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}