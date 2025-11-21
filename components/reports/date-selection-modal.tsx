import { Button } from "@/components/ui/core/button"
import { ReportCard } from "./report-data"

interface DateSelectionModalProps {
    selectedReport: string
    dateRangeType: 'preset' | 'custom'
    presetRange: string
    customStartDate: string
    customEndDate: string
    onDateRangeTypeChange: (type: 'preset' | 'custom') => void
    onPresetRangeChange: (range: string) => void
    onCustomStartDateChange: (date: string) => void
    onCustomEndDateChange: (date: string) => void
    onViewReport: (reportId: string) => void
    onGeneratePDF: (reportId: string) => void
    onClose: () => void
    isDateSelectionValid: boolean
    reports: ReportCard[]
}

export function DateSelectionModal({
    selectedReport,
    dateRangeType,
    presetRange,
    customStartDate,
    customEndDate,
    onDateRangeTypeChange,
    onPresetRangeChange,
    onCustomStartDateChange,
    onCustomEndDateChange,
    onViewReport,
    onGeneratePDF,
    onClose,
    isDateSelectionValid,
    reports
}: DateSelectionModalProps) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Select Date Range
                </h3>

                {/* Date Range Type Selection */}
                <div className="flex gap-4 mb-4">
                    <label className="flex items-center">
                        <input
                            type="radio"
                            value="preset"
                            checked={dateRangeType === 'preset'}
                            onChange={(e) => onDateRangeTypeChange(e.target.value as 'preset' | 'custom')}
                            className="mr-2"
                        />
                        Preset Range
                    </label>
                    <label className="flex items-center">
                        <input
                            type="radio"
                            value="custom"
                            checked={dateRangeType === 'custom'}
                            onChange={(e) => onDateRangeTypeChange(e.target.value as 'preset' | 'custom')}
                            className="mr-2"
                        />
                        Custom Range
                    </label>
                </div>

                {/* Preset Date Range */}
                {dateRangeType === 'preset' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Time Period
                        </label>
                        <select
                            value={presetRange}
                            onChange={(e) => onPresetRangeChange(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="week">Last 7 days</option>
                            <option value="month">Last 30 days</option>
                            <option value="quarter">Last 3 months</option>
                            <option value="year">Last year</option>
                        </select>
                    </div>
                )}

                {/* Custom Date Range */}
                {dateRangeType === 'custom' && (
                    <div className="mb-4 space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => onCustomStartDateChange(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => onCustomEndDateChange(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                        {!isDateSelectionValid && customStartDate && customEndDate && (
                            <p className="text-red-500 text-sm">
                                End date must be after start date
                            </p>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="px-4 py-2"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => onViewReport(selectedReport)}
                        disabled={!isDateSelectionValid}
                        className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        View Report
                    </Button>
                    {reports.find(r => r.id === selectedReport)?.canGeneratePDF && (
                        <Button
                            onClick={() => onGeneratePDF(selectedReport)}
                            disabled={!isDateSelectionValid}
                            className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
                        >
                            Generate PDF
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}