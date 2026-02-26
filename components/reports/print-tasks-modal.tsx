"use client"

import { useState } from "react"
import { Button } from "@/components/ui/core/button"
import { CalendarDays, FileText, Loader2, X } from "lucide-react"

interface PrintTasksModalProps {
    onClose: () => void
    onPrint: (startDate: string, endDate: string) => Promise<void>
}

export function PrintTasksModal({ onClose, onPrint }: PrintTasksModalProps) {
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const isValid = startDate && endDate && new Date(startDate) <= new Date(endDate)

    const handlePrint = async () => {
        if (!isValid) return
        setIsLoading(true)
        try {
            await onPrint(startDate, endDate)
            onClose()
        } catch {
            alert("Failed to generate PDF. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                            <FileText className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Print Tasks
                            </h3>
                            <p className="text-sm text-gray-500">
                                Select a date range to generate a PDF
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                {/* Date Inputs */}
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                        />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                        />
                    </div>
                    {startDate && endDate && !isValid && (
                        <p className="text-red-500 text-sm">
                            End date must be on or after the start date
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePrint}
                        disabled={!isValid || isLoading}
                        className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <FileText className="h-4 w-4 mr-2" />
                                Generate PDF
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
