"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/layout/card"
import { Download, Eye, BarChart3, PieChart as PieChartIcon, Users, Clock, DollarSign, ClipboardList, MapPin, CreditCard, TrendingUp } from "lucide-react"
import { ReportPreview } from "./previews/report-previews"

type ApiResponse = {
    success: boolean
    report: any
    type: string
}

interface ReportViewerProps {
    apiResponse?: ApiResponse
    reportData?: any
    reportType?: string
    onGeneratePDF?: () => void
    isGeneratingPDF?: boolean
}

export function ReportViewer({ apiResponse, reportData, reportType, onGeneratePDF, isGeneratingPDF }: ReportViewerProps) {
    const [data, setData] = useState<any>(null)
    const [type, setType] = useState<string>("")
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        if (apiResponse) {
            setData(apiResponse.report)
            setType(apiResponse.type)
        } else if (reportData && reportType) {
            setData(reportData)
            setType(reportType)
        }
    }, [apiResponse, reportData, reportType])

    if (!data) {
        return (
            <Card className="border-gray-200">
                <CardContent className="p-6">
                    <div className="text-center text-gray-500">
                        <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No report data to display</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const getReportIcon = () => {
        switch (type) {
            case "outstanding_payments":
                return <CreditCard className="h-5 w-5" />
            case "technician_performance":
                return <TrendingUp className="h-5 w-5" />
            case "revenue_summary":
                return <DollarSign className="h-5 w-5" />
            case "task_status":
                return <ClipboardList className="h-5 w-5" />
            case "technician_workload":
                return <Users className="h-5 w-5" />
            case "payment_methods":
                return <PieChartIcon className="h-5 w-5" />
            case "turnaround_time":
                return <Clock className="h-5 w-5" />
            case "inventory_location":
                return <MapPin className="h-5 w-5" />
            default:
                return <BarChart3 className="h-5 w-5" />
        }
    }

    return (
        <div className="space-y-6">
            {/* Report Content */}
            <ReportPreview type={type} data={data} searchTerm={searchTerm} />
        </div>
    )
}
