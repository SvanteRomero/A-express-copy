"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { UserCheck, User, Calendar, Clock } from "lucide-react"

interface EmployeeInfoCardProps {
    user: any
}

export function EmployeeInfoCard({ user }: EmployeeInfoCardProps) {
    const formatEmployeeId = (id: number): string => {
        if (!id) return "EMP-000"
        return `EMP-${id.toString().padStart(3, '0')}`
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Employee Information
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Employee ID</p>
                            {formatEmployeeId(user?.id)}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Calendar className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Start Date</p>
                            <p className="font-medium">
                                {user?.created_at ? new Date(user.created_at).toLocaleString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                }) : 'N/A'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Clock className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Last Login</p>
                            <p className="font-medium">
                                {user?.last_login ? new Date(user.last_login).toLocaleString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                }) : 'Never'}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
