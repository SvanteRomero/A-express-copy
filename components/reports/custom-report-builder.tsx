"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Input } from "@/components/ui/core/input"
import { Label } from "@/components/ui/core/label"
import { Checkbox } from "@/components/ui/core/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select"
import { ArrowLeft, Settings, Calendar, Filter, FileText, Download } from "lucide-react"
import { getApiUrl } from "@/lib/config"

const reportTypes = [
  { id: "financial", label: "Financial Analysis", description: "Revenue, payments, and cost analysis" },
  { id: "operational", label: "Operational Metrics", description: "Task status, turnaround times, efficiency" },
  { id: "performance", label: "Performance Review", description: "Technician productivity and quality metrics" },
  { id: "customer", label: "Customer Analytics", description: "Customer satisfaction and retention data" },
]

const dataFields = [
  { id: "task_id", label: "Task ID", category: "basic" },
  { id: "customer_name", label: "Customer Name", category: "basic" },
  { id: "laptop_model", label: "Laptop Model", category: "basic" },
  { id: "technician", label: "Assigned Technician", category: "basic" },
  { id: "status", label: "Current Status", category: "basic" },
  { id: "date_in", label: "Date In", category: "dates" },
  { id: "date_completed", label: "Date Completed", category: "dates" },
  { id: "turnaround_time", label: "Turnaround Time", category: "performance" },
  { id: "total_cost", label: "Total Cost", category: "financial" },
  { id: "parts_cost", label: "Parts Cost", category: "financial" },
  { id: "labor_cost", label: "Labor Cost", category: "financial" },
  { id: "payment_status", label: "Payment Status", category: "financial" },
  { id: "urgency", label: "Urgency Level", category: "basic" },
  { id: "location", label: "Current Location", category: "basic" },
]

const dateRanges = [
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "last_year", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
]

// PDF Generator function
const generatePDF = (reportData: any) => {
  // Handle the actual structure returned by your backend
  const { metadata, data } = reportData.report || reportData

  // Create a simple PDF using window.print() and CSS
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const formattedDate = new Date(metadata?.generated_at || new Date()).toLocaleString()

  // Get field names from the first data row or use default headers
  const headers = data && data.length > 0 ? Object.keys(data[0]) : []

  // Create summary from metadata or calculate basic stats
  const summary = {
    'Total Records': metadata?.total_records || (data ? data.length : 0),
    'Report Type': metadata?.report_type || 'Custom Report',
    'Date Range': metadata?.date_range || 'N/A'
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${metadata?.report_name || 'Report'}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px; 
          color: #333;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px;
          border-bottom: 2px solid #dc2626;
          padding-bottom: 20px;
        }
        .header h1 { 
          color: #dc2626; 
          margin: 0;
          font-size: 24px;
        }
        .metadata { 
          margin: 20px 0; 
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
        }
        .metadata-row { 
          display: flex; 
          justify-content: space-between; 
          margin: 5px 0;
          font-size: 12px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0;
          font-size: 11px;
        }
        th { 
          background-color: #dc2626; 
          color: white; 
          padding: 8px; 
          text-align: left;
        }
        td { 
          padding: 8px; 
          border-bottom: 1px solid #ddd;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .summary { 
          margin-top: 30px; 
          padding: 15px;
          background: #e8f5e8;
          border-radius: 5px;
        }
        .summary h3 { 
          color: #059669; 
          margin-top: 0;
        }
        .summary-item { 
          display: flex; 
          justify-content: space-between; 
          margin: 8px 0;
          font-size: 12px;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
        @media print {
          body { margin: 20px; }
          .no-print { display: none; }
        }
        .no-data {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${metadata?.report_name || 'Custom Report'}</h1>
        <p>${metadata?.report_type || 'Report'} Report</p>
      </div>
      
      <div class="metadata">
        <div class="metadata-row">
          <span><strong>Generated:</strong></span>
          <span>${formattedDate}</span>
        </div>
        <div class="metadata-row">
          <span><strong>Date Range:</strong></span>
          <span>${metadata?.date_range || 'N/A'}</span>
        </div>
        <div class="metadata-row">
          <span><strong>Total Records:</strong></span>
          <span>${metadata?.total_records || (data ? data.length : 0)}</span>
        </div>
      </div>

      ${data && data.length > 0 ? `
        <table>
          <thead>
            <tr>
              ${headers.map(key =>
    `<th>${key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</th>`
  ).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map((row: any) => `
              <tr>
                ${headers.map(header => {
    const value = row[header];
    // Format the value appropriately
    let displayValue = value;
    if (value === null || value === undefined) {
      displayValue = 'N/A';
    } else if (typeof value === 'number') {
      // Check if it's a currency field
      if (header.includes('cost') || header.includes('amount') || header.includes('revenue') || header.includes('price')) {
        displayValue = `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else {
        displayValue = value.toLocaleString();
      }
    } else if (typeof value === 'string' && value === '') {
      displayValue = 'N/A';
    }
    return `<td>${displayValue}</td>`;
  }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<div class="no-data"><p>No data available for this report</p></div>'}

      <div class="summary">
        <h3>Report Summary</h3>
        ${Object.entries(summary).map(([key, value]) => `
          <div class="summary-item">
            <span><strong>${key}:</strong></span>
            <span>${typeof value === 'number' ?
      (key.includes('cost') || key.includes('revenue') || key.includes('amount') ?
        `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` :
        Number(value).toLocaleString()
      ) :
      value
    }</span>
          </div>
        `).join('')}
      </div>

      <div class="footer">
        <p>Generated by Repair Management System</p>
        <button class="no-print" onclick="window.print()" style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 5px; cursor: pointer;">Print PDF</button>
      </div>

      <script>
        setTimeout(() => {
          window.print();
        }, 500);
      </script>
    </body>
    </html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

export function CustomReportBuilder() {
  const [reportName, setReportName] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [dateRange, setDateRange] = useState("last_30_days")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [generatedReport, setGeneratedReport] = useState<any>(null)

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields((prev) => (prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]))
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!reportName.trim()) {
      newErrors.reportName = "Report name is required"
    }

    if (!selectedType) {
      newErrors.selectedType = "Report type is required"
    }

    if (selectedFields.length === 0) {
      newErrors.selectedFields = "At least one data field must be selected"
    }

    if (!dateRange) {
      newErrors.dateRange = "Date range is required"
    }

    if (dateRange === "custom") {
      if (!customStartDate) {
        newErrors.customStartDate = "Start date is required for custom range"
      }
      if (!customEndDate) {
        newErrors.customEndDate = "End date is required for custom range"
      }
      if (customStartDate && customEndDate && customStartDate > customEndDate) {
        newErrors.customStartDate = "Start date cannot be after end date"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleGenerateReport = async () => {
    if (!validateForm()) {
      return
    }

    setIsGenerating(true)
    setErrors({})

    try {
      // Prepare the request payload
      const reportConfig: any = {
        reportName: reportName.trim(),
        selectedType,
        selectedFields,
        dateRange,
      }

      // Only include custom dates if dateRange is 'custom'
      if (dateRange === "custom") {
        reportConfig.customStartDate = customStartDate
        reportConfig.customEndDate = customEndDate
      }

      let token: string | null = null
      const authTokens = localStorage.getItem('auth_tokens')
      if (authTokens) {
        try {
          const parsedTokens = JSON.parse(authTokens)
          token = parsedTokens?.access ?? null
        } catch (e) {
          console.warn('Failed to parse auth_tokens from localStorage', e)
        }
      }

      const response = await fetch(getApiUrl("/reports/custom/generate/"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reportConfig),
      })

      const result = await response.json()

      console.log("Generate report response:", result)

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate report")
      }

      if (result.success) {
        console.log("Report generated:", result.report)
        setGeneratedReport(result)
        alert("Custom report generated successfully!")
      } else {
        throw new Error(result.error || "Report generation failed")
      }
    } catch (error) {
      console.error("Error generating report:", error)
      alert(`Error: ${error instanceof Error ? error.message : "Failed to generate report"}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPDF = () => {
    if (generatedReport) {
      generatePDF(generatedReport)
    }
  }

  const handleDateRangeChange = (value: string) => {
    setDateRange(value)
    // Clear custom dates when switching away from custom range
    if (value !== "custom") {
      setCustomStartDate("")
      setCustomEndDate("")
      setErrors(prev => ({
        ...prev,
        customStartDate: "",
        customEndDate: ""
      }))
    }
  }

  const isFormValid =
    reportName.trim() &&
    selectedType &&
    selectedFields.length > 0 &&
    dateRange &&
    (dateRange !== "custom" || (customStartDate && customEndDate && customStartDate <= customEndDate))

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:text-red-600"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reports
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Custom Report Builder</h1>
        <p className="text-gray-600 mt-2">Create tailored reports with specific data points and filters</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Report Configuration */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="h-5 w-5 text-red-600" />
              Report Configuration
            </CardTitle>
            <CardDescription>Define the basic parameters for your custom report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reportName">Report Name *</Label>
                <Input
                  id="reportName"
                  placeholder="Enter a name for your report"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className={errors.reportName ? "border-red-500" : ""}
                />
                {errors.reportName && (
                  <p className="text-sm text-red-600">{errors.reportName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type *</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className={errors.selectedType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.selectedType && (
                  <p className="text-sm text-red-600">{errors.selectedType}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Fields Selection */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="h-5 w-5 text-red-600" />
              Data Fields *
            </CardTitle>
            <CardDescription>Select the data fields to include in your report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dataFields.map((field) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => handleFieldToggle(field.id)}
                  />
                  <Label
                    htmlFor={field.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Selected: {selectedFields.length} field{selectedFields.length !== 1 ? "s" : ""}
            </div>
            {errors.selectedFields && (
              <p className="text-sm text-red-600 mt-2">{errors.selectedFields}</p>
            )}
          </CardContent>
        </Card>

        {/* Date Range Selection */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-red-600" />
              Date Range *
            </CardTitle>
            <CardDescription>Specify the time period for your report data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dateRange">Time Period *</Label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className={errors.dateRange ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  {dateRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.dateRange && (
                <p className="text-sm text-red-600">{errors.dateRange}</p>
              )}
            </div>

            {dateRange === "custom" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className={errors.customStartDate ? "border-red-500" : ""}
                  />
                  {errors.customStartDate && (
                    <p className="text-sm text-red-600">{errors.customStartDate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className={errors.customEndDate ? "border-red-500" : ""}
                  />
                  {errors.customEndDate && (
                    <p className="text-sm text-red-600">{errors.customEndDate}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate Report */}
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Generate Report</h3>
                <p className="text-gray-600 text-sm">Review your selections and generate the custom report</p>

                {/* Show download button if report is generated */}
                {generatedReport && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-800 text-sm font-medium">
                      Report generated successfully!
                      <Button
                        onClick={handleDownloadPDF}
                        variant="outline"
                        size="sm"
                        className="ml-3 bg-white hover:bg-green-50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 bg-transparent"
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateReport}
                  disabled={!isFormValid || isGenerating}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </div>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}