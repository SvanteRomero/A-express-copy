import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Badge } from "@/components/ui/core/badge"
import { DateSelectionModal } from "./date-selection-modal"
import { Eye, Download } from "lucide-react"
import { ReportCard } from "./report-data"

interface ReportSectionProps {
    title: string
    description: string
    reports: ReportCard[]
    onGeneratePDF: (reportId: string, dateRange?: { start: Date; end: Date }) => void
    onViewReport: (reportId: string, dateRange?: { start: Date; end: Date }) => void
}

export function ReportSection({
    title,
    description,
    reports,
    onGeneratePDF,
    onViewReport,
}: ReportSectionProps) {
    const [selectedReport, setSelectedReport] = useState<string | null>(null)
    const [dateRangeType, setDateRangeType] = useState<'preset' | 'custom'>('preset')
    const [presetRange, setPresetRange] = useState<string>('week')
    const [customStartDate, setCustomStartDate] = useState<string>('')
    const [customEndDate, setCustomEndDate] = useState<string>('')

    const handleViewReport = (reportId: string) => {
        const dateRange = getDateRange()
        onViewReport(reportId, dateRange)
        closeDateModal()
    }

    const handleGeneratePDF = (reportId: string) => {
        const dateRange = getDateRange()
        onGeneratePDF(reportId, dateRange)
        closeDateModal()
    }

    const getDateRange = () => {
        if (dateRangeType === 'preset') {
            const end = new Date()
            const start = new Date()

            switch (presetRange) {
                case 'week':
                    start.setDate(end.getDate() - 7)
                    break
                case 'month':
                    start.setMonth(end.getMonth() - 1)
                    break
                case 'quarter':
                    start.setMonth(end.getMonth() - 3)
                    break
                case 'year':
                    start.setFullYear(end.getFullYear() - 1)
                    break
                default:
                    start.setDate(end.getDate() - 7)
            }

            return { start, end }
        } else {
            if (!customStartDate || !customEndDate) return undefined
            return {
                start: new Date(customStartDate),
                end: new Date(customEndDate)
            }
        }
    }

    const openDateModal = (reportId: string) => {
        setSelectedReport(reportId)
    }

    const closeDateModal = () => {
        setSelectedReport(null)
        setDateRangeType('preset')
        setPresetRange('week')
        setCustomStartDate('')
        setCustomEndDate('')
    }

    const isDateSelectionValid = () => {
        if (dateRangeType === 'custom') {
            if (!customStartDate || !customEndDate) return false
            const start = new Date(customStartDate)
            const end = new Date(customEndDate)
            return start <= end
        }
        return true
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                <p className="text-gray-600 text-sm">{description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reports.map((report) => (
                    <Card key={report.id} className="border-gray-200 hover:border-red-300 hover:shadow-md transition-all duration-200 group">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                                        <report.icon className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-base font-medium text-gray-900 group-hover:text-red-700 transition-colors">
                                            {report.title}
                                        </CardTitle>
                                        {report.lastGenerated && <p className="text-xs text-gray-500 mt-1">Last: {report.lastGenerated}</p>}
                                    </div>
                                </div>
                                {report.badge && (
                                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                                        {report.badge}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardDescription className="text-gray-600 text-sm leading-relaxed mb-4">
                                {report.description}
                            </CardDescription>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDateModal(report.id)}
                                    className="p-0 h-auto text-red-600 hover:text-red-700 font-medium"
                                >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Report
                                </Button>
                                {report.canGeneratePDF && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openDateModal(report.id)}
                                        className="p-0 h-auto text-gray-600 hover:text-gray-700 font-medium"
                                    >
                                        <Download className="h-3 w-3 mr-1" />
                                        PDF
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Date Selection Modal */}
            {selectedReport && (
                <DateSelectionModal
                    selectedReport={selectedReport}
                    dateRangeType={dateRangeType}
                    presetRange={presetRange}
                    customStartDate={customStartDate}
                    customEndDate={customEndDate}
                    onDateRangeTypeChange={setDateRangeType}
                    onPresetRangeChange={setPresetRange}
                    onCustomStartDateChange={setCustomStartDate}
                    onCustomEndDateChange={setCustomEndDate}
                    onViewReport={handleViewReport}
                    onGeneratePDF={handleGeneratePDF}
                    onClose={closeDateModal}
                    isDateSelectionValid={isDateSelectionValid()}
                    reports={reports}
                />
            )}
        </div>
    )
}