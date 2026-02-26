"use client"

import { useState, useEffect, useCallback } from "react"
import { ReportSection } from "./report-section"
import { financialReports, operationalReports, technicianReports, SelectedReport } from "./report-data"
import { generatePDF } from "./utils/pdf-generator"
import { generatePrintTasksPDF } from "./utils/generators"
import { ReportViewerModal } from "./report-viewer-modal"
import { PrintTasksModal } from "./print-tasks-modal"
import { Printer } from "lucide-react"
import { API_CONFIG } from "@/lib/config"


export function ReportsOverview() {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<SelectedReport | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [showPrintTasksModal, setShowPrintTasksModal] = useState(false)

  // Handle PDF generation
  const handleGeneratePDF = async (reportId: string) => {
    setIsGeneratingPDF(reportId)
    try {
      await generatePDF(reportId, selectedReport, setIsGeneratingPDF)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  // Handle view report
  const handleViewReport = useCallback(async (
    reportId: string,
    dateRange?: { start: Date; end: Date },
    page: number = 1,
    pageSize: number = 10,
    searchTerm?: string
  ) => {
    console.log('🔄 DEBUG - handleViewReport called:', { reportId, dateRange, page, pageSize, searchTerm })

    try {
      const apiEndpoints: { [key: string]: string } = {
        'outstanding-payments': '/reports/outstanding-payments/',
        'payment-methods': '/reports/payment-methods/',
        'task-status': '/reports/task-status/',
        'task-execution': '/reports/task-execution/',
        'workload': '/reports/technician-workload/',
        'performance': '/reports/technician-performance/',
        'inventory-location': '/reports/laptops-in-shop/',
        'front-desk-performance': '/reports/front-desk-performance/'
      }

      const endpoint = apiEndpoints[reportId]
      if (!endpoint) {
        console.warn(`❌ No endpoint mapped for report: ${reportId}`)
        return
      }

      // Build query parameters
      const params: Record<string, string> = {}

      // Handle date range
      if (dateRange) {
        const formatDate = (date: Date) => date.toISOString().split('T')[0]
        params.start_date = formatDate(dateRange.start)
        params.end_date = formatDate(dateRange.end)
        console.log('📅 DEBUG - Added date range params')
      }

      // Add pagination parameters
      const paginatedReports = ['outstanding-payments', 'task-execution']
      if (paginatedReports.includes(reportId)) {
        params.page = page.toString()
        params.page_size = pageSize.toString()
        console.log('📄 DEBUG - Added pagination params:', { page, pageSize })
      }

      // Add search parameter
      if (searchTerm) {
        params.search = searchTerm
        console.log('🔍 DEBUG - Added search param:', searchTerm)
      }

      console.log('🌐 DEBUG - Making request to:', endpoint, 'with params:', params)

      // Use apiClient which has withCredentials: true for cookie auth
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.get(endpoint, { params })

      console.log('📨 DEBUG - Response status:', response.status)

      const data = response.data
      console.log('✅ DEBUG - Response data structure:', {
        success: data.success,
        type: data.type,
        reportKeys: data.report ? Object.keys(data.report) : 'no report',
        pagination: data.report?.pagination
      })

      setSelectedReport({
        id: reportId,
        data,
        ...(paginatedReports.includes(reportId) && {
          currentPage: page,
          pageSize: pageSize
        })
      })
      setIsViewerOpen(true)

    } catch (error) {
      console.error('❌ DEBUG - Error fetching report:', error)
      alert(`Failed to load report data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, []) // Empty dependency array as it doesn't depend on props/state

  // Handle page changes
  const handlePageChange = useCallback(async (page: number, pageSize: number) => {
    console.log('🔄🔄🔄 DEBUG - handlePageChange CALLED in reports-overview:')
    console.log('  page:', page)
    console.log('  pageSize:', pageSize)
    console.log('  selectedReport:', selectedReport?.id)

    if (selectedReport) {
      // Get the current date range from the selected report data
      const reportData = selectedReport.data.report
      let currentDateRange = undefined

      if (reportData?.start_date && reportData?.end_date) {
        currentDateRange = {
          start: new Date(reportData.start_date),
          end: new Date(reportData.end_date)
        }
        console.log('📅 DEBUG - Using date range from report data:', currentDateRange)
      }

      console.log('🚀 DEBUG - Calling handleViewReport with:', {
        reportId: selectedReport.id,
        page,
        pageSize
      })

      await handleViewReport(selectedReport.id, currentDateRange, page, pageSize)
    } else {
      console.error('❌❌❌ DEBUG - No selectedReport found when handlePageChange was called!')
    }
  }, [selectedReport, handleViewReport])

  // Handle search
  const handleSearch = useCallback(async (searchTerm: string) => {
    if (selectedReport) {
      // Get the current date range from the selected report data
      const reportData = selectedReport.data.report
      let currentDateRange = undefined

      if (reportData?.start_date && reportData?.end_date) {
        currentDateRange = {
          start: new Date(reportData.start_date),
          end: new Date(reportData.end_date)
        }
      }

      // Reset to page 1 for new search
      await handleViewReport(selectedReport.id, currentDateRange, 1, 10, searchTerm)
    }
  }, [selectedReport, handleViewReport])

  // Handle closing viewer
  const handleCloseViewer = useCallback(() => {
    setIsViewerOpen(false)
    setTimeout(() => setSelectedReport(null), 300)
  }, [])

  // Handle print tasks
  const handlePrintTasks = useCallback(async (startDate: string, endDate: string) => {
    const { apiClient } = await import('@/lib/api-client')
    const response = await apiClient.get('/reports/print-tasks/', {
      params: { start_date: startDate, end_date: endDate }
    })
    const data = response.data
    if (!data.success || !data.report) {
      throw new Error('Failed to fetch tasks data')
    }
    generatePrintTasksPDF(data.report)
  }, [])

  // Escape key and backdrop click handling
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isViewerOpen) {
        handleCloseViewer()
      }
    }

    if (isViewerOpen) {
      document.addEventListener('keydown', handleEscapeKey)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      document.body.style.overflow = 'unset'
    }
  }, [isViewerOpen, handleCloseViewer])

  return (
    <div className="flex-1 space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and view business reports and analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPrintTasksModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Print Tasks
          </button>
        </div>
      </div>

      {/* Report Categories */}
      <div className="space-y-8">
        <ReportSection
          title="Financial Reports"
          description="Revenue tracking, payment analysis, and financial performance metrics"
          reports={financialReports}
          onGeneratePDF={handleGeneratePDF}
          onViewReport={handleViewReport}
        />

        <ReportSection
          title="Operational Reports"
          description="Task management, efficiency metrics, and inventory tracking"
          reports={operationalReports}
          onGeneratePDF={handleGeneratePDF}
          onViewReport={handleViewReport}
        />

        <ReportSection
          title="Staff Performance"
          description="Workload distribution, performance analysis, and productivity metrics"
          reports={technicianReports}
          onGeneratePDF={handleGeneratePDF}
          onViewReport={handleViewReport}
        />
      </div>

      {/* Report Viewer Modal */}
      {isViewerOpen && selectedReport && (
        <ReportViewerModal
          selectedReport={selectedReport}
          isGeneratingPDF={isGeneratingPDF}
          onGeneratePDF={handleGeneratePDF}
          onClose={handleCloseViewer}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          reports={[...financialReports, ...operationalReports, ...technicianReports]}
        />
      )}

      {/* Print Tasks Modal */}
      {showPrintTasksModal && (
        <PrintTasksModal
          onClose={() => setShowPrintTasksModal(false)}
          onPrint={handlePrintTasks}
        />
      )}
    </div>
  )
}