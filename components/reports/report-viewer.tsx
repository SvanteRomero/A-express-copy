import { useState } from "react"
import { ReportPreview } from "./previews/report-previews"

interface ReportViewerProps {
    apiResponse: any
    onGeneratePDF: () => void
    isGeneratingPDF: boolean
    onPageChange?: (page: number, pageSize: number) => void
    currentPage?: number
    pageSize?: number
}

export function ReportViewer({
    apiResponse,
    onGeneratePDF,
    isGeneratingPDF,
    onPageChange,
    currentPage = 1,
    pageSize = 10
}: ReportViewerProps) {
    const [searchTerm, setSearchTerm] = useState("")

    return (
        <div className="space-y-4">
            {/* Search input for outstanding payments */}
            {apiResponse.type === 'outstanding_payments' && (
                <div className="flex items-center gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Search tasks, customers, or phones..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>
            )}

            <ReportPreview
                type={apiResponse.type}
                data={apiResponse.report}
                searchTerm={searchTerm}
                onPageChange={onPageChange || (() => { })}
                isLoading={false}
            />
        </div>
    )
}