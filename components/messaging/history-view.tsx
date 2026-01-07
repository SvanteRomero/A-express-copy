"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/layout/table";
import { Badge } from "@/components/ui/core/badge";
import { Search, RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/core/input";
import { Button } from "@/components/ui/core/button";
import { getStatusColor } from "./utils";
import { getMessageHistory } from "@/lib/api-client";

const ITEMS_PER_PAGE = 20;

export function MessageHistory() {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to first page on search
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getMessageHistory({
                page: currentPage,
                search: debouncedSearch || undefined,
            });
            // Handle paginated response
            if (data && typeof data === 'object' && 'results' in data) {
                setLogs(data.results);
                setTotalCount(data.count || 0);
            } else if (Array.isArray(data)) {
                // Fallback for non-paginated response
                setLogs(data);
                setTotalCount(data.length);
            } else {
                setLogs([]);
                setTotalCount(0);
            }
        } catch (error) {
            console.error("Failed to fetch history", error);
            setLogs([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, debouncedSearch]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Message History</CardTitle>
                        <CardDescription>View a log of all sent messages.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchHistory}>
                        <RotateCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search history..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Recipient</TableHead>
                                <TableHead className="w-[40%]">Message</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Sent By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Loading history...
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No message history found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {new Date(log.sent_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{log.customer_name}</div>
                                            <div className="text-xs text-muted-foreground">{log.recipient_phone}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-[400px] truncate" title={log.message_content}>
                                                {log.message_content}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={log.status === "sent" ? "outline" : "destructive"} className={log.status === "sent" ? "bg-green-100 text-green-800 border-green-200" : ""}>
                                                {log.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {log.sent_by_name || "System"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1 || loading}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages} ({totalCount} total)
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || loading}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
