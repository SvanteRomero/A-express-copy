'use client';

/**
 * WebSocket Provider for real-time notifications.
 * Manages WebSocket connection lifecycle and provides context to child components.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { useAuth, User } from '@/hooks/use-auth';
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
    ConnectionQuality,
} from '@/lib/websocket';
import { showSchedulerNotificationToast } from '@/components/notifications/toast';
import { dispatchWebSocketToast } from '@/components/notifications/toast/websocket-toasts';
import { showTransactionRequestToast, dismissTransactionRequestToast } from '@/components/notifications/toast/request-toast';
import { showDebtRequestToast, dismissDebtRequestToast } from '@/components/notifications/toast/debt-request-toast';
import { isToastEnabled } from '@/components/provider/notification-preferences';

function processSchedulerNotification(msg: SchedulerNotificationMessage): void {
    if (isToastEnabled(msg.job_type)) {
        showSchedulerNotificationToast({
            id: Date.now(),
            job_type: msg.job_type,
            tasks_found: msg.tasks_found,
            messages_sent: msg.messages_sent,
            messages_failed: msg.messages_failed,
            failure_details: msg.failure_details,
            created_at: msg.created_at,
        });
    }
}

function processToastNotification(msg: ToastNotificationMessage, qc: QueryClient): void {
    dispatchWebSocketToast(msg);
    if (msg.toast_type === 'debt_request_approved' || msg.toast_type === 'debt_request_rejected') {
        qc.invalidateQueries({ queryKey: ['tasks'] });
        if (msg.data.task_title) {
            qc.invalidateQueries({ queryKey: ['task', msg.data.task_title] });
        }
    }
}

function processTaskStatusUpdate(msg: TaskStatusUpdateMessage, qc: QueryClient): void {
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['task', msg.task_id] });
    qc.invalidateQueries({ queryKey: ['technicianTasks'] });
    qc.invalidateQueries({ queryKey: ['technicianHistoryTasks'] });
}

function processDataUpdate(msg: DataUpdateMessage, qc: QueryClient): void {
    if (msg.type === 'payment_update') {
        qc.invalidateQueries({ queryKey: ['payments'] });
        qc.invalidateQueries({ queryKey: ['revenue-overview'] });
        qc.invalidateQueries({ queryKey: ['tasks'] });
        qc.invalidateQueries({ queryKey: ['technicianTasks'] });
        if (msg.task_id) qc.invalidateQueries({ queryKey: ['task', msg.task_id] });
    } else if (msg.type === 'customer_update') {
        qc.invalidateQueries({ queryKey: ['customers'] });
        qc.invalidateQueries({ queryKey: ['customer-stats'] });
    } else if (msg.type === 'account_update') {
        qc.invalidateQueries({ queryKey: ['accounts'] });
    } else if (msg.type === 'transaction_update') {
        qc.invalidateQueries({ queryKey: ['transactionRequests'] });
        qc.invalidateQueries({ queryKey: ['expenditureRequests'] });
        qc.invalidateQueries({ queryKey: ['financial-summary'] });
        qc.invalidateQueries({ queryKey: ['payments'] });
        qc.invalidateQueries({ queryKey: ['accounts'] });
    } else if (msg.type === 'payment_method_update') {
        qc.invalidateQueries({ queryKey: ['paymentMethods'] });
        qc.invalidateQueries({ queryKey: ['paymentCategories'] });
    }
}

function processTransactionRequest(msg: TransactionRequestMessage, currentUser: User | null, qc: QueryClient): boolean {
    if (currentUser?.id === msg.requester_id) return true;
    if (isToastEnabled('transaction_request')) {
        showTransactionRequestToast(msg, () => {
            qc.invalidateQueries({ queryKey: ['transactionRequests'] });
            qc.invalidateQueries({ queryKey: ['expenditureRequests'] });
        });
    }
    return false;
}

function processDebtRequest(msg: DebtRequestMessage, currentUser: User | null, qc: QueryClient): boolean {
    if (currentUser?.id === msg.requester_id) return true;
    if (isToastEnabled('debt_request')) {
        showDebtRequestToast(msg, () => {
            qc.invalidateQueries({ queryKey: ['tasks'] });
            qc.invalidateQueries({ queryKey: ['task', msg.task_id] });
        });
    }
    return false;
}

interface WebSocketContextType {
    isConnected: boolean;
    connectionQuality: ConnectionQuality;
    lastMessage: WebSocketMessage | null;
    forceReconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: Readonly<{ children: React.ReactNode }>) {
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

        if (message.type === 'scheduler_notification') {
            processSchedulerNotification(message);
        } else if (message.type === 'toast_notification') {
            processToastNotification(message, currentQueryClient);
        } else if (message.type === 'task_status_update') {
            processTaskStatusUpdate(message, currentQueryClient);
        } else if (message.type === 'payment_update' || message.type === 'customer_update' || message.type === 'account_update' || message.type === 'transaction_update' || message.type === 'payment_method_update') {
            processDataUpdate(message, currentQueryClient);
        } else if (message.type === 'transaction_request') {
            if (processTransactionRequest(message, currentUser, currentQueryClient)) return;
        } else if (message.type === 'debt_request') {
            if (processDebtRequest(message, currentUser, currentQueryClient)) return;
        } else if (message.type === 'debt_request_resolved') {
            dismissDebtRequestToast(message.request_id);
        } else if (message.type === 'transaction_request_resolved') {
            dismissTransactionRequestToast(message.request_id);
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
        } else if (wsClient.current) {
            // Disconnect if user logs out or role changes
            wsClient.current.disconnect();
            wsClient.current = null;
        }
    }, [user, isAuthenticated, connectWebSocket, handleMessage, handleStatusChange, handleQualityChange]);

    const contextValue = useMemo(() => ({ isConnected, connectionQuality, lastMessage, forceReconnect }), [isConnected, connectionQuality, lastMessage, forceReconnect]);

    return (
        <WebSocketContext.Provider value={contextValue}>
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
