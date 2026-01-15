'use client';

/**
 * WebSocket Provider for real-time notifications.
 * Manages WebSocket connection lifecycle and provides context to child components.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import {
    getWebSocketClient,
    NotificationWebSocket,
    WebSocketMessage,
    SchedulerNotificationMessage
} from '@/lib/websocket';
import { showSchedulerNotificationToast } from '@/components/notifications/toast';

interface WebSocketContextType {
    isConnected: boolean;
    lastMessage: WebSocketMessage | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const wsClient = useRef<NotificationWebSocket | null>(null);
    const isConnecting = useRef(false);

    // Handle incoming messages
    const handleMessage = useCallback((message: WebSocketMessage) => {
        setLastMessage(message);

        // Handle scheduler notifications - show toast
        if (message.type === 'scheduler_notification') {
            const notification = message as SchedulerNotificationMessage;
            // Convert to the format expected by showSchedulerNotificationToast
            showSchedulerNotificationToast({
                id: Date.now(), // Generate a temporary ID
                job_type: notification.job_type,
                tasks_found: notification.tasks_found,
                messages_sent: notification.messages_sent,
                messages_failed: notification.messages_failed,
                failure_details: notification.failure_details,
                created_at: notification.created_at,
            });
        }
    }, []);

    // Handle connection status changes
    const handleStatusChange = useCallback((connected: boolean) => {
        setIsConnected(connected);
    }, []);

    // Fetch WebSocket token and connect
    const connectWebSocket = useCallback(async () => {
        if (isConnecting.current || wsClient.current?.isConnected) return;
        isConnecting.current = true;

        try {
            // Get a temporary token for WebSocket authentication
            const response = await apiClient.post<{ token: string }>('/auth/ws-token/');
            const token = response.data.token;

            if (token) {
                wsClient.current = getWebSocketClient();
                wsClient.current.addMessageHandler(handleMessage);
                wsClient.current.addStatusHandler(handleStatusChange);
                wsClient.current.connect(token);
            }
        } catch (error) {
            console.debug('Failed to get WebSocket token:', error);
        } finally {
            isConnecting.current = false;
        }
    }, [handleMessage, handleStatusChange]);

    // Connect/disconnect based on auth state
    useEffect(() => {
        // Only connect for managers and front_desk
        const allowedRoles = ['manager', 'front_desk'];
        const shouldConnect = isAuthenticated && user && allowedRoles.includes(user.role);

        if (shouldConnect) {
            connectWebSocket();

            return () => {
                if (wsClient.current) {
                    wsClient.current.removeMessageHandler(handleMessage);
                    wsClient.current.removeStatusHandler(handleStatusChange);
                    wsClient.current.disconnect();
                    wsClient.current = null;
                }
            };
        } else {
            // Disconnect if user logs out or role changes
            if (wsClient.current) {
                wsClient.current.disconnect();
                wsClient.current = null;
            }
        }
    }, [user, isAuthenticated, connectWebSocket, handleMessage, handleStatusChange]);

    return (
        <WebSocketContext.Provider value={{ isConnected, lastMessage }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocketContext() {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocketContext must be used within a WebSocketProvider');
    }
    return context;
}
