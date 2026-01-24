'use client';

/**
 * WebSocket Provider for real-time notifications.
 * Manages WebSocket connection lifecycle and provides context to child components.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import {
    getWebSocketClient,
    NotificationWebSocket,
    WebSocketMessage,
    SchedulerNotificationMessage,
    ToastNotificationMessage,
    TaskStatusUpdateMessage,
    DataUpdateMessage,
    TransactionRequestMessage,
    DebtRequestMessage,
    DebtRequestResolvedMessage,
    ConnectionQuality,
} from '@/lib/websocket';
import { showSchedulerNotificationToast } from '@/components/notifications/toast';
import { dispatchWebSocketToast } from '@/components/notifications/toast/websocket-toasts';
import { showTransactionRequestToast } from '@/components/notifications/toast/transaction-request-toast';
import { showDebtRequestToast, dismissDebtRequestToast } from '@/components/notifications/toast/debt-request-toast';

interface WebSocketContextType {
    isConnected: boolean;
    connectionQuality: ConnectionQuality;
    lastMessage: WebSocketMessage | null;
    forceReconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const [isConnected, setIsConnected] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('disconnected');
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const wsClient = useRef<NotificationWebSocket | null>(null);
    const isConnecting = useRef(false);

    // Store latest values in refs to use in stable handler
    const userRef = useRef(user);
    const queryClientRef = useRef(queryClient);

    // Keep refs up to date
    useEffect(() => {
        userRef.current = user;
        queryClientRef.current = queryClient;
    }, [user, queryClient]);

    // Handle incoming messages - use refs for stable reference
    const handleMessage = useCallback((message: WebSocketMessage) => {
        const currentUser = userRef.current;
        const currentQueryClient = queryClientRef.current;

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

        // Handle toast notifications - dispatch to appropriate toast
        if (message.type === 'toast_notification') {
            const toastMessage = message as ToastNotificationMessage;
            dispatchWebSocketToast(toastMessage);

            // Invalidate queries for debt-related toasts to update UI in real-time
            if (toastMessage.toast_type === 'debt_request_approved' || toastMessage.toast_type === 'debt_request_rejected') {
                // Extract task_id from the task_title if needed, or invalidate all tasks
                currentQueryClient.invalidateQueries({ queryKey: ['tasks'] });
                // If we can extract task_id from data, invalidate specific task
                if (toastMessage.data.task_title) {
                    currentQueryClient.invalidateQueries({ queryKey: ['task', toastMessage.data.task_title] });
                }
            }
        }

        // Handle task status updates - invalidate React Query caches for live updates
        if (message.type === 'task_status_update') {
            const { task_id } = message as TaskStatusUpdateMessage;
            currentQueryClient.invalidateQueries({ queryKey: ['tasks'] });
            currentQueryClient.invalidateQueries({ queryKey: ['task', task_id] });
            currentQueryClient.invalidateQueries({ queryKey: ['technicianTasks'] });
            currentQueryClient.invalidateQueries({ queryKey: ['technicianHistoryTasks'] });
        }

        // Handle payment updates
        if (message.type === 'payment_update') {
            const data = message as DataUpdateMessage;
            currentQueryClient.invalidateQueries({ queryKey: ['payments'] });
            currentQueryClient.invalidateQueries({ queryKey: ['revenue-overview'] });
            currentQueryClient.invalidateQueries({ queryKey: ['tasks'] }); // Update lists
            currentQueryClient.invalidateQueries({ queryKey: ['technicianTasks'] }); // Update technician lists
            if (data.task_id) {
                currentQueryClient.invalidateQueries({ queryKey: ['task', data.task_id] });
            }
        }

        // Handle customer updates
        if (message.type === 'customer_update') {
            currentQueryClient.invalidateQueries({ queryKey: ['customers'] });
            currentQueryClient.invalidateQueries({ queryKey: ['customer-stats'] });
        }

        // Handle account updates
        if (message.type === 'account_update') {
            currentQueryClient.invalidateQueries({ queryKey: ['accounts'] });
        }

        // Handle transaction updates
        if (message.type === 'transaction_update') {
            currentQueryClient.invalidateQueries({ queryKey: ['transactionRequests'] });
            currentQueryClient.invalidateQueries({ queryKey: ['expenditureRequests'] }); // Legacy query key alias
            currentQueryClient.invalidateQueries({ queryKey: ['financial-summary'] });
            currentQueryClient.invalidateQueries({ queryKey: ['payments'] });
            currentQueryClient.invalidateQueries({ queryKey: ['accounts'] });
        }

        // Handle payment method updates
        if (message.type === 'payment_method_update') {
            currentQueryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
            currentQueryClient.invalidateQueries({ queryKey: ['paymentCategories'] });
        }

        // Handle transaction request notifications - show interactive toast to managers
        if (message.type === 'transaction_request') {
            const data = message as TransactionRequestMessage;

            // Validate: Don't show toast to the person who made the request
            if (currentUser && currentUser.id === data.requester_id) {
                return;
            }

            showTransactionRequestToast(data, () => {
                currentQueryClient.invalidateQueries({ queryKey: ['transactionRequests'] });
                currentQueryClient.invalidateQueries({ queryKey: ['expenditureRequests'] });
            });
        }

        // Handle debt request notifications - show interactive toast to managers
        if (message.type === 'debt_request') {
            const data = message as DebtRequestMessage;

            // Validate: Don't show toast to the person who made the request
            if (currentUser && currentUser.id === data.requester_id) {
                return;
            }

            showDebtRequestToast(data, () => {
                currentQueryClient.invalidateQueries({ queryKey: ['tasks'] });
                currentQueryClient.invalidateQueries({ queryKey: ['task', data.task_id] });
            });
        }

        // Handle debt request resolved - dismiss toast for all managers
        if (message.type === 'debt_request_resolved') {
            const data = message as DebtRequestResolvedMessage;
            dismissDebtRequestToast(data.request_id);
        }
    }, []); // Empty deps - uses refs for stable reference

    // Handle connection status changes
    const handleStatusChange = useCallback((connected: boolean) => {
        setIsConnected(connected);
    }, []);

    // Handle connection quality changes
    const handleQualityChange = useCallback((quality: ConnectionQuality) => {
        setConnectionQuality(quality);
    }, []);

    // Manually trigger reconnection
    const forceReconnect = useCallback(() => {
        if (wsClient.current) {
            wsClient.current.forceReconnect();
        }
    }, []);

    // Connect to WebSocket (uses cookie-based auth, same as HTTP)
    const connectWebSocket = useCallback(() => {
        if (isConnecting.current || wsClient.current?.isConnected) return;
        isConnecting.current = true;

        try {
            wsClient.current = getWebSocketClient();
            wsClient.current.addMessageHandler(handleMessage);
            wsClient.current.addStatusHandler(handleStatusChange);
            wsClient.current.addQualityHandler(handleQualityChange);
            wsClient.current.connect();
        } catch (error) {
            console.debug('Failed to connect WebSocket:', error);
        } finally {
            isConnecting.current = false;
        }
    }, [handleMessage, handleStatusChange, handleQualityChange]);

    // Connect/disconnect based on auth state
    useEffect(() => {
        // Connect for all authenticated users
        const shouldConnect = isAuthenticated && user;

        if (shouldConnect) {
            connectWebSocket();

            return () => {
                if (wsClient.current) {
                    wsClient.current.removeMessageHandler(handleMessage);
                    wsClient.current.removeStatusHandler(handleStatusChange);
                    wsClient.current.removeQualityHandler(handleQualityChange);
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
    }, [user, isAuthenticated, connectWebSocket, handleMessage, handleStatusChange, handleQualityChange]);

    return (
        <WebSocketContext.Provider value={{ isConnected, connectionQuality, lastMessage, forceReconnect }}>
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
