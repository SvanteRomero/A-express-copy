import { Button } from "@/components/ui/core/button"
import { ReportViewer } from "./report-viewer"
import { BarChart3, Download } from "lucide-react"
import { ReportCard, SelectedReport } from "./report-data"

interface ReportViewerModalProps {
    selectedReport: SelectedReport
    isGeneratingPDF: string | null
    onGeneratePDF: (reportId: string) => void
    onClose: () => void
    onPageChange?: (page: number, pageSize: number) => void
    reports: ReportCard[]
}

export function ReportViewerModal({
    selectedReport,
    isGeneratingPDF,
    onGeneratePDF,
    onClose,
    onPageChange,
    reports
}: ReportViewerModalProps) {
    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose()
        }
    }

    const report = reports.find(r => r.id === selectedReport.id)
    const IconComponent = report?.icon || BarChart3

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                            <IconComponent className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                                {selectedReport.data.report?.title || report?.title || selectedReport.id.replace(/-/g, ' ')}
                            </h3>
                            <p className="text-gray-600 text-sm">
                                {report?.description || 'Live report data from your backend'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onGeneratePDF(selectedReport.id)}
                            disabled={isGeneratingPDF === selectedReport.id}
                            className="text-gray-600 hover:text-gray-700"
                        >
                            {isGeneratingPDF === selectedReport.id ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                                    PDF
                                </div>
                            ) : (
                                <>
                                    <Download className="h-4 w-4 mr-1" />
                                    PDF
                                </>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                            title="Close (Esc)"
                        >
                            <span className="text-lg">×</span>
                        </Button>
                    </div>
                </div>

                {/* Report Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <ReportViewer
                        apiResponse={selectedReport.data}
                        onGeneratePDF={() => onGeneratePDF(selectedReport.id)}
                        isGeneratingPDF={isGeneratingPDF === selectedReport.id}
                        onPageChange={onPageChange}
                        currentPage={selectedReport.currentPage || 1}
                        pageSize={selectedReport.pageSize || 10}
                    />
                </div>

                {/* Modal Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50 sticky bottom-0">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Report generated on {new Date().toLocaleString()}
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="border-gray-300"
                                onClick={onClose}
                            >
                                Close Report
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}