"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card"
import { Button } from "@/components/ui/core/button"
import { Badge } from "@/components/ui/core/badge"
import { Monitor } from "lucide-react"
import { getSessions, revokeSession, revokeAllSessions } from "@/lib/api-client"

export function SessionManagementCard() {
    const [sessions, setSessions] = useState<any[]>([])
    const [loadingSessions, setLoadingSessions] = useState(false)

    useEffect(() => {
        const loadSessions = async () => {
            setLoadingSessions(true)
            try {
                const resp = await getSessions()
                setSessions(resp.data || [])
            } catch (err) {
                console.error('Failed to load sessions', err)
            } finally {
                setLoadingSessions(false)
            }
        }

        loadSessions()
    }, [])

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Session Management
                </CardTitle>
                <CardDescription>Monitor and manage your active sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3">
                    {loadingSessions ? (
                        <p className="text-sm text-gray-600">Loading sessions...</p>
                    ) : (
                        sessions.length > 0 ? (
                            sessions.map((s) => (
                                <div key={s.id} className={`flex items-center justify-between p-3 border rounded-lg ${s.is_current ? 'border-green-300 bg-green-50' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${s.is_current ? 'bg-green-100' : 'bg-gray-100'}`}>
                                            <Monitor className={`h-4 w-4 ${s.is_current ? 'text-green-600' : 'text-gray-600'}`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{s.device_info || s.device_name || 'Unknown device'}</p>
                                                {s.is_current && (
                                                    <Badge className="bg-green-100 text-green-800 text-xs">Current Session</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">{s.ip_address || 'Unknown IP'} · {new Date(s.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!s.is_revoked ? (
                                            <Button variant="outline" size="sm" onClick={async () => {
                                                // Show confirmation dialog
                                                const confirmMessage = s.is_current
                                                    ? "This will end your current session and log you out. Are you sure?"
                                                    : "Are you sure you want to revoke this session?";

                                                if (!window.confirm(confirmMessage)) {
                                                    return;
                                                }

                                                try {
                                                    const resp = await revokeSession(s.id);
                                                    setSessions((prev) => prev.map((ps) => ps.id === s.id ? { ...ps, is_revoked: true } : ps));

                                                    // If revoking current session, redirect to login
                                                    if (resp.data?.logout_required) {
                                                        localStorage.removeItem('auth_user');
                                                        window.location.href = '/';
                                                    }
                                                } catch (err) {
                                                    console.error('Failed to revoke session', err);
                                                }
                                            }}>
                                                {s.is_current ? 'End Session' : 'Revoke'}
                                            </Button>
                                        ) : (
                                            <Badge className="bg-gray-100 text-gray-700">Revoked</Badge>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-600">No active sessions found.</p>
                        )
                    )}
                </div>
                <Button variant="outline" className="w-full bg-transparent text-red-600 hover:bg-red-50 hover:text-red-700" onClick={async () => {
                    // Show confirmation dialog
                    if (!window.confirm("This will sign you out of ALL devices, including this one. You will need to log in again. Are you sure?")) {
                        return;
                    }

                    try {
                        await revokeAllSessions();
                        // Clear local storage and redirect to login
                        localStorage.removeItem('auth_user');
                        window.location.href = '/';
                    } catch (err) {
                        console.error('Failed to revoke all sessions', err);
                    }
                }}>
                    Sign Out All Devices
                </Button>
            </CardContent>
        </Card>
    )
}
