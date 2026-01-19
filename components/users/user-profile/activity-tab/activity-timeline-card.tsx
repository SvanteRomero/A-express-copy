"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Badge } from "@/components/ui/core/badge"
import { Activity, CheckCircle, User, Shield, FileText } from "lucide-react"
import { getProfileActivity } from "@/lib/api-client"

export function ActivityTimelineCard() {
    const [activityItems, setActivityItems] = useState<any[]>([])
    const [activityLoading, setActivityLoading] = useState(false)
    const [activityPage, setActivityPage] = useState(1)
    const [activityHasMore, setActivityHasMore] = useState(false)

    useEffect(() => {
        const loadActivity = async (page = 1) => {
            setActivityLoading(true)
            try {
                const resp = await getProfileActivity({ page, page_size: 25 })
                const data = resp.data || {}
                setActivityItems(data.results || [])
                setActivityHasMore(!!data.has_more)
                setActivityPage(data.page || 1)
            } catch (err) {
                console.error('Failed to load profile activity', err)
            } finally {
                setActivityLoading(false)
            }
        }

        loadActivity()
    }, [])

    const getActivityIcon = (type: string) => {
        switch (type) {
            case "task":
                return <CheckCircle className="h-4 w-4 text-green-600" />
            case "profile":
                return <User className="h-4 w-4 text-blue-600" />
            case "security":
                return <Shield className="h-4 w-4 text-red-600" />
            case "report":
                return <FileText className="h-4 w-4 text-purple-600" />
            default:
                return <Activity className="h-4 w-4 text-gray-600" />
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Activity Timeline
                        </CardTitle>
                        <CardDescription>Your recent actions and system events</CardDescription>
                    </div>
                    <div className="text-sm text-gray-500">
                        {activityItems.length} event{activityItems.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {activityLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    </div>
                ) : activityItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No activity yet</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                        <div className="space-y-4">
                            {activityItems.map((activity, idx) => {
                                // Determine category color
                                const categoryColors: Record<string, string> = {
                                    task: 'bg-green-100 text-green-600 border-green-200',
                                    profile: 'bg-blue-100 text-blue-600 border-blue-200',
                                    security: 'bg-red-100 text-red-600 border-red-200',
                                    report: 'bg-purple-100 text-purple-600 border-purple-200',
                                    payment: 'bg-amber-100 text-amber-600 border-amber-200',
                                    customer: 'bg-cyan-100 text-cyan-600 border-cyan-200',
                                };
                                const category = activity.category || activity.source || 'default';
                                const colorClass = categoryColors[category] || 'bg-gray-100 text-gray-600 border-gray-200';

                                // Format relative time
                                const getRelativeTime = (timestamp: string) => {
                                    const now = new Date();
                                    const activityTime = new Date(timestamp);
                                    const diffMs = now.getTime() - activityTime.getTime();
                                    const diffMins = Math.floor(diffMs / 60000);
                                    const diffHours = Math.floor(diffMs / 3600000);
                                    const diffDays = Math.floor(diffMs / 86400000);

                                    if (diffMins < 1) return 'Just now';
                                    if (diffMins < 60) return `${diffMins}m ago`;
                                    if (diffHours < 24) return `${diffHours}h ago`;
                                    if (diffDays < 7) return `${diffDays}d ago`;
                                    return activityTime.toLocaleDateString();
                                };

                                return (
                                    <div key={activity.id} className="relative pl-10">
                                        {/* Timeline dot */}
                                        <div className={`absolute left-2 w-4 h-4 rounded-full border-2 ${colorClass}`} />

                                        <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className={`p-2 rounded-lg ${colorClass}`}>
                                                        {getActivityIcon(category)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900">{activity.message}</p>
                                                        {activity.metadata?.summary && (
                                                            <p className="text-sm text-gray-600 mt-1">{activity.metadata.summary}</p>
                                                        )}
                                                        {activity.related_task && (
                                                            <div className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                                                                <FileText className="h-3 w-3" />
                                                                <span>Task: {activity.related_task.title}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 text-right">
                                                    <span className="text-xs text-gray-400">{getRelativeTime(activity.timestamp)}</span>
                                                    <Badge className={`text-xs ${colorClass} border`}>
                                                        {category.charAt(0).toUpperCase() + category.slice(1)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Load more button */}
                {activityHasMore && (
                    <div className="mt-6 text-center">
                        <Button variant="outline" onClick={async () => {
                            const nextPage = activityPage + 1;
                            try {
                                const resp = await getProfileActivity({ page: nextPage, page_size: 25 });
                                const data = resp.data || {};
                                setActivityItems((prev) => [...prev, ...(data.results || [])]);
                                setActivityHasMore(!!data.has_more);
                                setActivityPage(data.page || nextPage);
                            } catch (err) {
                                console.error('Failed to load more activity', err);
                            }
                        }}>
                            Load more activity
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
