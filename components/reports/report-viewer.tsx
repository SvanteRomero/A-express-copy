import { useState, useEffect, useRef } from "react"
import { ReportPreview } from "./previews/report-previews"
import { useDebounce } from "@/hooks/use-debounce"

interface ReportViewerProps {
    apiResponse: any
    onGeneratePDF: () => void
    isGeneratingPDF: boolean
    onPageChange?: (page: number, pageSize: number) => void
    onSearch?: (term: string) => void
    currentPage?: number
    pageSize?: number
}

export function ReportViewer({
    apiResponse,
    onGeneratePDF,
    isGeneratingPDF,
    onPageChange,
    onSearch,
    currentPage = 1,
    pageSize = 10
}: ReportViewerProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const debouncedSearchTerm = useDebounce(searchTerm, 500)

    // Use ref to track the latest onSearch callback without triggering effects
    const onSearchRef = useRef(onSearch)
    const isFirstRun = useRef(true)

    useEffect(() => {
        onSearchRef.current = onSearch
    }, [onSearch])

    // Trigger search when debounced value changes
    useEffect(() => {
        // Skip the first run to prevent double-fetching on mount (parent already fetched initial data)
        if (isFirstRun.current) {
            isFirstRun.current = false
            return
        }

        if (onSearchRef.current) {
            onSearchRef.current(debouncedSearchTerm)
        }
    }, [debouncedSearchTerm]) // Removed onSearch from dependencies to prevent loops

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
                searchTerm={""} // Pass empty string to disable client-side filtering in preview
                onPageChange={onPageChange || (() => { })}
                isLoading={false}
            />
        </div>
    )
}