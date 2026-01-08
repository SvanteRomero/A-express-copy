"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs";
import { ComposeView } from "@/components/messaging/compose-view";
import { MessageHistory } from "@/components/messaging/history-view";
import { TemplateManager } from "@/components/messaging/templates-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Users, Send, AlertCircle, Package } from "lucide-react";
import { getDashboardStats } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

// ... existing imports

export function MessagingDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("compose");
    const [readyForPickupCount, setReadyForPickupCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const isManager = user?.role === "Manager";

    useEffect(() => {
        // ... existing fetchStats
        const fetchStats = async () => {
            try {
                const data = await getDashboardStats();
                setReadyForPickupCount(data.tasks_ready_for_pickup_count);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="flex-1 space-y-6 p-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Bulk Messaging</h2>
                <p className="text-muted-foreground">
                    Send SMS updates to customers.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ready for Pickup</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "-" : readyForPickupCount}</div>
                    </CardContent>
                </Card>

                {/* ... More cards can go here */}
            </div>

            <Tabs defaultValue="compose" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className={`grid w-full ${isManager ? 'grid-cols-3' : 'grid-cols-2'} bg-gray-100`}>
                    <TabsTrigger value="compose" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Compose Message</TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Message History</TabsTrigger>
                    {isManager && (
                        <TabsTrigger value="templates" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Manage Templates</TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="compose">
                    <ComposeView />
                </TabsContent>

                <TabsContent value="history">
                    <MessageHistory />
                </TabsContent>

                {isManager && (
                    <TabsContent value="templates">
                        <TemplateManager />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
