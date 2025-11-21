"use client"

import { useState, useEffect } from "react"
import { ReportSection } from "./report-section"

import { financialReports, operationalReports, technicianReports, SelectedReport } from "./report-data"
import { generatePDF } from "./pdf-generator"
import { ReportViewerModal } from "./report-viewer-modal"


export function ReportsOverview() {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<SelectedReport | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)

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
  const handleViewReport = async (
    reportId: string,
    dateRange?: { start: Date; end: Date },
    page: number = 1,
    pageSize: number = 10
  ) => {
    console.log('🔄 DEBUG - handleViewReport called:', { reportId, dateRange, page, pageSize })

    try {
      const apiEndpoints: { [key: string]: string } = {
        'revenue-summary': '/api/reports/revenue-summary/',
        'outstanding-payments': '/api/reports/outstanding-payments/',
        'payment-methods': '/api/reports/payment-methods/',
        'task-status': '/api/reports/task-status/',
        'turnaround-time': '/api/reports/turnaround-time/',
        'workload': '/api/reports/technician-workload/',
        'performance': '/api/reports/technician-performance/',
        'inventory-location': '/api/reports/laptops-in-shop/'
      }

      const endpoint = apiEndpoints[reportId]
      if (!endpoint) {
        console.warn(`❌ No endpoint mapped for report: ${reportId}`)
        return
      }

      // Build URL with parameters
      let url = `http://localhost:8000${endpoint}`
      const params = new URLSearchParams()

      // Handle date range
      if (dateRange) {
        const formatDate = (date: Date) => date.toISOString().split('T')[0]
        params.append('start_date', formatDate(dateRange.start))
        params.append('end_date', formatDate(dateRange.end))
        console.log('📅 DEBUG - Added date range params')
      } else {
        // Add default date range for revenue summary if none provided
        if (reportId === 'revenue-summary') {
          const end = new Date()
          const start = new Date()
          start.setDate(end.getDate() - 30)
          params.append('start_date', start.toISOString().split('T')[0])
          params.append('end_date', end.toISOString().split('T')[0])
          console.log('📅 DEBUG - Added default date range for revenue summary')
        }
      }

      // Add pagination parameters
      const paginatedReports = ['outstanding-payments', 'turnaround-time', 'revenue-summary']
      if (paginatedReports.includes(reportId)) {
        params.append('page', page.toString())
        params.append('page_size', pageSize.toString())
        console.log('📄 DEBUG - Added pagination params:', { page, pageSize })
      }

      // Add period type for turnaround time
      if (reportId === 'turnaround-time') {
        params.append('period_type', 'weekly')
        console.log('📊 DEBUG - Added period_type param')
      }

      // Add parameters to URL if any exist
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      console.log('🌐 DEBUG - Final URL:', url)

      // Get authentication token
      let token: string | null = null
      const authTokens = localStorage.getItem('auth_tokens')
      if (authTokens) {
        try {
          const parsedTokens = JSON.parse(authTokens)
          token = parsedTokens?.access ?? null
          console.log('🔐 DEBUG - Token found:', !!token)
        } catch (e) {
          console.warn('❌ Failed to parse auth_tokens from localStorage', e)
        }
      }

      // Make the request
      console.log('🚀 DEBUG - Making fetch request...')
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
      })

      console.log('📨 DEBUG - Response status:', response.status)
      console.log('📨 DEBUG - Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ DEBUG - HTTP error details:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
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
  }

  // Handle page changes
  const handlePageChange = async (page: number, pageSize: number) => {
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
  }

  // Handle closing viewer
  const handleCloseViewer = () => {
    setIsViewerOpen(false)
    setTimeout(() => setSelectedReport(null), 300)
  }

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
  }, [isViewerOpen])

  return (
    <div className="flex-1 space-y-8 p-6">
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
          title="Technician Performance"
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
          reports={[...financialReports, ...operationalReports, ...technicianReports]}
        />
      )}
    </div>
  )
}