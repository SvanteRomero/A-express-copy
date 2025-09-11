"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Label } from "@/components/ui/core/label"
import { Textarea } from "@/components/ui/core/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { ArrowLeft, User, Laptop, ClipboardList, AlertTriangle, CheckCircle } from "lucide-react"
import { createTask } from "@/lib/api-client"

interface FormData {
  customer_name: string
  customer_phone: string
  customer_email: string
  laptop_make: string
  laptop_model: string
  serial_number: string
  description: string
  urgency: string
  current_location: string
}

interface FormErrors {
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  laptop_make?: string
  laptop_model?: string
  serial_number?: string
  description?: string
  urgency?: string
  current_location?: string
}

const urgencyOptions = [
  { value: "Low", label: "Low - Non-urgent repair" },
  { value: "Medium", label: "Medium - Standard priority" },
  { value: "High", label: "High - Urgent repair needed" },
]

const locationOptions = [
  { value: "Front Desk Intake", label: "Front Desk Intake" },
  { value: "Diagnostic Station", label: "Diagnostic Station" },
  { value: "Repair Bay 1", label: "Repair Bay 1" },
  { value: "Repair Bay 2", label: "Repair Bay 2" },
  { value: "Parts Storage", label: "Parts Storage" },
  { value: "Quality Control", label: "Quality Control" },
]

export function NewTaskForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    laptop_make: "",
    laptop_model: "",
    serial_number: "",
    description: "",
    urgency: "",
    current_location: "Front Desk Intake", // Default value
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = "Customer name is required"
    }

    if (!formData.customer_phone.trim()) {
      newErrors.customer_phone = "Phone number is required"
    } else {
      const phoneRegex = /^\(\d{3}\)\s\d{3}-\d{4}$/
      if (!phoneRegex.test(formData.customer_phone)) {
        newErrors.customer_phone = "Phone number must be in format (555) 123-4567"
      }
    }

    if (formData.customer_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.customer_email)) {
        newErrors.customer_email = "Please enter a valid email address"
      }
    }

    if (!formData.serial_number.trim()) {
      newErrors.serial_number = "Laptop serial number is required"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Issue description is required"
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "Issue description must be at least 10 characters"
    }

    if (!formData.urgency) {
      newErrors.urgency = "Please select an urgency level"
    }

    if (!formData.current_location) {
      newErrors.current_location = "Please select a current location"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "")

    if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    } else {
      return digits
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (field === "customer_phone") {
      value = formatPhoneNumber(value)
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await createTask(formData)
      setSubmitSuccess(true)
      setTimeout(() => {
        router.push("/dashboard/tasks")
      }, 2000)
    } catch (error) {
      console.error("Error creating task:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push("/dashboard/tasks")
  }

  if (submitSuccess) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">Task Created Successfully!</h2>
              <p className="text-green-700 mb-4">
                The new repair task has been created and added to the system. You will be redirected to the tasks list
                shortly.
              </p>
              <Button onClick={() => router.push("/dashboard/tasks")} className="bg-green-600 hover:bg-green-700">
                Go to Tasks List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-red-600" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Create New Task</h1>
        <p className="text-gray-600 mt-2">Enter all required information to create a new repair task</p>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Information Section */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-red-600" />
                Customer Information
              </CardTitle>
              <CardDescription>Enter the customer's contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name" className="text-gray-700 font-medium">
                  Customer Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_name"
                  type="text"
                  placeholder="Enter customer's full name"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange("customer_name", e.target.value)}
                  className={`h-11 border-gray-300 focus:border-red-500 focus:ring-red-500 ${
                    errors.customer_name ? "border-red-300 bg-red-50" : ""
                  }`}
                />
                {errors.customer_name && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.customer_name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_phone" className="text-gray-700 font-medium">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange("customer_phone", e.target.value)}
                  className={`h-11 border-gray-300 focus:border-red-500 focus:ring-red-500 ${
                    errors.customer_phone ? "border-red-300 bg-red-50" : ""
                  }`}
                  maxLength={14}
                />
                <p className="text-xs text-gray-500">Format: (555) 123-4567</p>
                {errors.customer_phone && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.customer_phone}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_email" className="text-gray-700 font-medium">
                  Email Address <span className="text-gray-400">(Optional)</span>
                </Label>
                <Input
                  id="customer_email"
                  type="email"
                  placeholder="customer@example.com"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange("customer_email", e.target.value)}
                  className={`h-11 border-gray-300 focus:border-red-500 focus:ring-red-500 ${
                    errors.customer_email ? "border-red-300 bg-red-50" : ""
                  }`}
                />
                {errors.customer_email && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.customer_email}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Laptop Details Section */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Laptop className="h-5 w-5 text-red-600" />
                Laptop Details
              </CardTitle>
              <CardDescription>Provide information about the laptop being repaired</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="laptop_make" className="text-gray-700 font-medium">
                    Make
                  </Label>
                  <Input
                    id="laptop_make"
                    type="text"
                    placeholder="e.g., Apple, Dell, HP, Lenovo"
                    value={formData.laptop_make}
                    onChange={(e) => handleInputChange("laptop_make", e.target.value)}
                    className="h-11 border-gray-300 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="laptop_model" className="text-gray-700 font-medium">
                    Model
                  </Label>
                  <Input
                    id="laptop_model"
                    type="text"
                    placeholder='e.g., MacBook Pro 13", XPS 15'
                    value={formData.laptop_model}
                    onChange={(e) => handleInputChange("laptop_model", e.target.value)}
                    className="h-11 border-gray-300 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_number" className="text-gray-700 font-medium">
                  Laptop Serial Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="serial_number"
                  type="text"
                  placeholder="Enter the laptop's serial number"
                  value={formData.serial_number}
                  onChange={(e) => handleInputChange("serial_number", e.target.value)}
                  className={`h-11 border-gray-300 focus:border-red-500 focus:ring-red-500 ${
                    errors.serial_number ? "border-red-300 bg-red-50" : ""
                  }`}
                />
                <p className="text-xs text-gray-500">Usually found on the bottom of the laptop or in system settings</p>
                {errors.serial_number && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.serial_number}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Issue & Initial Assessment Section */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-red-600" />
                Issue & Initial Assessment
              </CardTitle>
              <CardDescription>Describe the problem and set initial task parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700 font-medium">
                  Initial Issue Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the problem in detail. Include any error messages, symptoms, or customer observations..."
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className={`min-h-[120px] border-gray-300 focus:border-red-500 focus:ring-red-500 resize-none ${
                    errors.description ? "border-red-300 bg-red-50" : ""
                  }`}
                  rows={5}
                />
                <p className="text-xs text-gray-500">
                  Minimum 10 characters. Be as detailed as possible to help technicians understand the issue.
                </p>
                {errors.description && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency" className="text-gray-700 font-medium">
                  Urgency Level <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(value) => handleInputChange("urgency", value)}
                >
                  <SelectTrigger
                    className={`h-11 border-gray-300 focus:border-red-500 focus:ring-red-500 ${
                      errors.urgency ? "border-red-300 bg-red-50" : ""
                    }`}
                  >
                    <SelectValue placeholder="Select urgency level" />
                  </SelectTrigger>
                  <SelectContent>
                    {urgencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.urgency && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.urgency}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_location" className="text-gray-700 font-medium">
                  Current Physical Location <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.current_location}
                  onValueChange={(value) => handleInputChange("current_location", value)}
                >
                  <SelectTrigger
                    className={`h-11 border-gray-300 focus:border-red-500 focus:ring-red-500 ${
                      errors.current_location ? "border-red-300 bg-red-50" : ""
                    }`}
                  >
                    <SelectValue placeholder="Select current location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Where is the laptop currently located in the shop?</p>
                {errors.current_location && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.current_location}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-8 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2 bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating Task...
                </div>
              ) : (
                "Create Task"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}