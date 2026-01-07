'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Label } from "@/components/ui/core/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { Laptop, Edit, User, MapPin } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { updateTask } from "@/lib/api-client"
import { useTask } from "@/hooks/use-tasks"
import { useBrands } from "@/hooks/use-brands"
import { useModels } from "@/hooks/use-models"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { SetStateAction, useState } from "react"
import { SimpleCombobox } from "@/components/ui/core/combobox"

interface LaptopInformationProps {
  taskId: string
}

export default function LaptopInformation({ taskId }: LaptopInformationProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: taskData, isLoading, isError, error } = useTask(taskId)
  const { data: brands } = useBrands()
  const [modelSearch, setModelSearch] = useState("")
  const { data: models, isLoading: isLoadingModels } = useModels({ query: modelSearch })
  const [isEditingLaptop, setIsEditingLaptop] = useState(false)
  const modelOptions = models ? models.filter((m: any) => m?.name).map((m: any) => ({ label: m.name, value: m.name })) : []

  const updateTaskMutation = useMutation({
    mutationFn: (updates: { [key: string]: any }) => updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] })
    },
  })

  const handleFieldUpdate = async (field: string, value: any) => {
    updateTaskMutation.mutate({ [field]: value })
  }

  const isAdmin = user?.role === "Administrator"
  const isManager = user?.role === "Manager"

  if (isLoading) {
    return <div>Loading laptop information...</div>
  }

  if (isError) {
    return <div>Error loading laptop information.</div>
  }

  if (!taskData) {
    return <div>No task data found.</div>
  }

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Laptop className="h-5 w-5 text-red-600" />
            Laptop Information
          </CardTitle>
          {(isAdmin || isManager) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingLaptop(!isEditingLaptop)}
              className="border-gray-300 text-gray-600 bg-transparent"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-gray-600">Make & Model</Label>
            {isEditingLaptop ? (
              <div className="flex gap-2">
                <Select
                  value={taskData.brand?.toString() || ""}
                  onValueChange={value => handleFieldUpdate("brand", parseInt(value, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands?.map(brand => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <SimpleCombobox
                  options={modelOptions}
                  value={taskData.laptop_model_details?.name || ""}
                  onChange={(value: any) => {
                    handleFieldUpdate("laptop_model", value)
                  }}
                  onInputChange={(value: SetStateAction<string>) => {
                    setModelSearch(value)
                  }}
                  placeholder="Model"
                  disabled={isLoadingModels || !taskData.brand}
                />
              </div>
            ) : (
              <div className="flex gap-2">
                <p className="text-gray-900 font-medium">{taskData.brand_details?.name || "N/A"}</p>
                <p className="text-gray-900 font-medium">{taskData.laptop_model_details?.name || "N/A"}</p>
              </div>
            )}
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Current Location</Label>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900">{taskData.current_location}</span>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Negotiated By</Label>
            <div className="flex items-center gap-2 mt-1">
              <User className="h-4 w-4 text-gray-400" />
              {isEditingLaptop && isManager ? (
                <Input
                  value={taskData.negotiated_by_details?.full_name || ""}
                  onChange={e => handleFieldUpdate("negotiated_by", e.target.value)}
                  className="mt-1"
                />
              ) : (
                <span className="text-gray-900">
                  {taskData.negotiated_by_details?.full_name || taskData.created_by_details?.full_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}