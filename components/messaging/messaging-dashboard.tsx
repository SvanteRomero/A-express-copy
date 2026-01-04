"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/layout/tabs";
import { ComposeView } from "@/components/messaging/compose-view";
import { MessageHistory } from "@/components/messaging/history-view";
import { TemplateManager } from "@/components/messaging/templates-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Users, Send, AlertCircle, Package } from "lucide-react";

// Mock permissions - In real app, this would come from AuthContext
const userRole = "manager"; // 'manager' | 'front_desk'

export function MessagingDashboard() {
    const [activeTab, setActiveTab] = useState("compose");

    return (
        <div className="flex-1 space-y-6 p-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Bulk Messaging</h2>
                <p className="text-muted-foreground">
                    Send SMS updates to customers.
                </p>
            </div>

            {/* Stats Cards - TODO: Fetch real stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ready for Pickup</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                    </CardContent>
                </Card>

                {/* ... More cards can go here */}
            </div>

            <Tabs defaultValue="compose" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="compose">Compose Message</TabsTrigger>
                    <TabsTrigger value="history">Message History</TabsTrigger>
                    {userRole === "manager" && (
                        <TabsTrigger value="templates">Manage Templates</TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="compose">
                    <ComposeView />
                </TabsContent>

                <TabsContent value="history">
                    <MessageHistory />
                </TabsContent>

                <TabsContent value="templates">
                    <TemplateManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
