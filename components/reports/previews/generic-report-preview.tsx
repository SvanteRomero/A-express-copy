"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"

export const GenericReportPreview = ({ report }: { report: any }) => {
    return (
        <Card>
            <CardHeader><CardTitle>Report Data.</CardTitle></CardHeader>
            <CardContent>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(report, null, 2)}
                </pre>
            </CardContent>
        </Card>
    )
}
