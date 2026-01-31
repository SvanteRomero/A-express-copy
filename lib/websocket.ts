/**
 * WebSocket client for real-time notifications.
 * Pure TypeScript - no React dependencies.
 */

// Message types received from the backend
export interface SchedulerNotificationMessage {
    type: 'scheduler_notification';
    job_type: 'pickup_reminder' | 'debt_reminder';
    tasks_found: number;
    messages_sent: number;
    messages_failed: number;
    failure_details: Array<{ task_id: string; task_title: string; error: string }>;
    created_at: string;
}

export interface ConnectionMessage {
    type: 'connection_established';
    message: string;
}

export interface PongMessage {
    type: 'pong';
}

export interface ToastNotificationMessage {
    type: 'toast_notification';
    id: string;
    toast_type: 'task_created' | 'task_approved' | 'task_picked_up' | 'payment_added' | 'task_updated' | 'task_completed' | 'task_sent_to_workshop' | 'workshop_task_solved' | 'workshop_task_not_solved' | 'task_assigned' | 'payment_method_created' | 'payment_method_updated' | 'payment_method_deleted' | 'debt_request_approved' | 'debt_request_rejected' | 'task_terminated' | 'workshop_outcome_to_verify' | 'workshop_outcome_disputed' | 'workshop_outcome_confirmed' | 'transaction_request_approved' | 'transaction_request_rejected';
    data: {
        task_title?: string;
        customer_name?: string;
        amount?: string;
        sms_sent?: boolean;
        sms_phone?: string;
        is_debt?: boolean;
        fields_changed?: string[];
        technician_name?: string;
        sender_name?: string;
        assigner_name?: string;
        payment_method_name?: string;
        user_name?: string;
        approver_name?: string;
        workshop_status?: string;
        workshop_technician_name?: string;
        previous_status?: string;
        disputer_name?: string;
        confirmer_name?: string;
    };
}

export interface TaskStatusUpdateMessage {
    type: 'task_status_update';
    task_id: string;
    new_status: string;
    updated_fields: string[];
}

export interface DataUpdateMessage {
    type: 'payment_update' | 'customer_update' | 'account_update' | 'transaction_update' | 'payment_method_update';
    task_id?: string;
    customer_id?: number;
}

// Transaction request message (for both Expenditure and Revenue)
export interface TransactionRequestMessage {
    type: 'transaction_request';
    request_id: number;
    transaction_type: 'Expenditure' | 'Revenue';
    description: string;
    amount: string;
    requester_name: string;
    requester_id: number;
}

// Debt request message (from Front Desk/Accountant to Managers)
export interface DebtRequestMessage {
    type: 'debt_request';
    request_id: string;
    task_id: string;
    task_title: string;
    requester_name: string;
    requester_id: number;
}

// Debt request resolved message (dismisses toast for all managers)
export interface DebtRequestResolvedMessage {
    type: 'debt_request_resolved';
    request_id: string;
}

// Transaction request resolved message (dismisses toast for all managers)
export interface TransactionRequestResolvedMessage {
    type: 'transaction_request_resolved';
    request_id: number;
}

export type WebSocketMessage = SchedulerNotificationMessage | ConnectionMessage | PongMessage | ToastNotificationMessage | TaskStatusUpdateMessage | DataUpdateMessage | TransactionRequestMessage | DebtRequestMessage | DebtRequestResolvedMessage | TransactionRequestResolvedMessage;

export type MessageHandler = (message: WebSocketMessage) => void;
export type ConnectionStatusHandler = (isConnected: boolean) => void;
export type ConnectionQuality = 'connected' | 'degraded' | 'disconnected';
export type ConnectionQualityHandler = (quality: ConnectionQuality) => void;

export interface WebSocketClientConfig {
    baseUrl?: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    pingInterval?: number;
    heartbeatTimeout?: number;
}

/**
 * Get the WebSocket base URL from the API URL.
 * Converts http://localhost:8000/api to ws://localhost:8000
 */
function getWebSocketBaseUrl(): string {
    if (typeof window === 'undefined') {
        return 'ws://localhost:8000';
    }

    // Try to get from environment variable first (build-time)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
        try {
            // Convert http(s)://host/api to ws(s)://host
            const url = new URL(apiUrl);
            const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${wsProtocol}//${url.host}`;
        } catch (e) {
            console.error('Invalid NEXT_PUBLIC_API_URL:', apiUrl);
        }
    }

    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    // Railway deployment: frontend and backend are separate services
    // The backend URL should be set via NEXT_PUBLIC_API_URL
    // If not set, we can't auto-detect it (different Railway services have different URLs)
    if (host.includes('railway.app') || host.includes('vercel.app')) {
        // Check if there's a backend URL stored in window (set by config)
        const backendUrl = (window as unknown as { __BACKEND_URL__?: string }).__BACKEND_URL__;
        if (backendUrl) {
            try {
                const url = new URL(backendUrl);
                return `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
            } catch (e) {
                console.error('Invalid __BACKEND_URL__:', backendUrl);
            }
        }

        // Fallback: try to derive from API client config if available
        console.warn('WebSocket: No NEXT_PUBLIC_API_URL set for production. WebSocket will not connect.');
        return '';  // Empty URL will prevent connection attempts
    }

    // Cloud development environments (GitHub Codespaces, Gitpod)
    if (host.includes('github.dev') || host.includes('gitpod.io')) {
        // Replace frontend port with backend port
        if (host.includes('-3000')) {
            const backendHost = host.replace('-3000', '-8000');
            return `${protocol}//${backendHost}`;
        }
    }

    // Default: localhost with Django port
    return 'ws://localhost:8000';
}

const DEFAULT_CONFIG: Required<WebSocketClientConfig> = {
    baseUrl: getWebSocketBaseUrl(),
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    pingInterval: 30000,
    heartbeatTimeout: 45000, // 1.5x ping interval
};

/**
 * WebSocket client class for managing notification connections.
 * Handles connection, reconnection, authentication, and message handling.
 */
export class NotificationWebSocket {
    private ws: WebSocket | null = null;
    private messageHandlers: Set<MessageHandler> = new Set();
    private statusHandlers: Set<ConnectionStatusHandler> = new Set();
    private qualityHandlers: Set<ConnectionQualityHandler> = new Set();
    private reconnectAttempts = 0;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private reconnectResetTimeout: ReturnType<typeof setTimeout> | null = null;
    private pingInterval: ReturnType<typeof setInterval> | null = null;
    private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
    private config: Required<WebSocketClientConfig>;
    private isIntentionalClose = false;
    private lastMessageTime: number = Date.now();
    private connectionQuality: ConnectionQuality = 'disconnected';

    constructor(config: WebSocketClientConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Connect to the WebSocket server.
     * Authentication is handled via cookies (same as HTTP requests).
     */
    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.debug('WebSocket already connected');
            return;
        }

        this.isIntentionalClose = false;
        this.createConnection();
    }

    /**
     * Disconnect from the WebSocket server.
     */
    disconnect(): void {
        this.isIntentionalClose = true;
        this.cleanup();
    }

    /**
     * Add a handler for incoming messages.
     */
    addMessageHandler(handler: MessageHandler): void {
        this.messageHandlers.add(handler);
    }

    /**
     * Remove a message handler.
     */
    removeMessageHandler(handler: MessageHandler): void {
        this.messageHandlers.delete(handler);
    }

    /**
     * Add a handler for connection status changes.
     */
    addStatusHandler(handler: ConnectionStatusHandler): void {
        this.statusHandlers.add(handler);
    }

    /**
     * Remove a status handler.
     */
    removeStatusHandler(handler: ConnectionStatusHandler): void {
        this.statusHandlers.delete(handler);
    }

    /**
     * Add a handler for connection quality changes.
     */
    addQualityHandler(handler: ConnectionQualityHandler): void {
        this.qualityHandlers.add(handler);
    }

    /**
     * Remove a quality handler.
     */
    removeQualityHandler(handler: ConnectionQualityHandler): void {
        this.qualityHandlers.delete(handler);
    }

    /**
     * Check if WebSocket is connected.
     */
    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Get current connection quality.
     */
    get quality(): ConnectionQuality {
        return this.connectionQuality;
    }

    /**
     * Manually force a reconnection.
     * Resets reconnection attempts and immediately reconnects.
     */
    forceReconnect(): void {
        console.log('Manual reconnection triggered');
        this.reconnectAttempts = 0;
        this.updateConnectionQuality('disconnected');
        this.cleanup();
        this.connect();
    }

    private createConnection(): void {
        const wsUrl = `${this.config.baseUrl}/ws/notifications/`;

        try {
            this.ws = new WebSocket(wsUrl);
            this.setupEventHandlers();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.scheduleReconnect();
        }
    }

    private setupEventHandlers(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.debug('WebSocket connected');
            this.reconnectAttempts = 0;
            this.lastMessageTime = Date.now();
            this.updateConnectionQuality('connected');
            this.notifyStatusHandlers(true);
            this.startPing();
            this.startHeartbeatMonitor();
        };

        this.ws.onclose = (event) => {
            console.debug(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
            this.updateConnectionQuality('disconnected');
            this.notifyStatusHandlers(false);
            this.stopPing();
            this.stopHeartbeatMonitor();

            if (!this.isIntentionalClose) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            // WebSocket errors are typically transient (reconnects handle them)
            // Use debug level to reduce console noise in development
            console.debug('WebSocket error (will auto-reconnect):', error);
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as WebSocketMessage;
                this.lastMessageTime = Date.now();

                // If we were degraded, restore to connected
                if (this.connectionQuality === 'degraded') {
                    this.updateConnectionQuality('connected');
                }

                this.notifyMessageHandlers(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
    }

    private notifyMessageHandlers(message: WebSocketMessage): void {
        this.messageHandlers.forEach((handler) => {
            try {
                handler(message);
            } catch (error) {
                console.error('Message handler error:', error);
            }
        });
    }

    private notifyStatusHandlers(isConnected: boolean): void {
        this.statusHandlers.forEach((handler) => {
            try {
                handler(isConnected);
            } catch (error) {
                console.error('Status handler error:', error);
            }
        });
    }

    private notifyQualityHandlers(quality: ConnectionQuality): void {
        this.qualityHandlers.forEach((handler) => {
            try {
                handler(quality);
            } catch (error) {
                console.error('Quality handler error:', error);
            }
        });
    }

    private updateConnectionQuality(quality: ConnectionQuality): void {
        if (this.connectionQuality !== quality) {
            console.debug(`Connection quality changed: ${this.connectionQuality} -> ${quality}`);
            this.connectionQuality = quality;
            this.notifyQualityHandlers(quality);
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            console.warn('Max reconnect attempts reached. Will reset and retry in 2 minutes...');
            this.updateConnectionQuality('disconnected');

            // Schedule a reset of reconnection attempts after 2 minutes
            // This allows recovery from temporary network outages
            this.reconnectResetTimeout = setTimeout(() => {
                console.log('Resetting reconnection attempts, trying again...');
                this.reconnectAttempts = 0;
                this.scheduleReconnect();
            }, 120000); // 2 minutes
            return;
        }

        this.reconnectAttempts++;
        const delay = this.config.reconnectInterval * Math.min(this.reconnectAttempts, 5);

        console.debug(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimeout = setTimeout(() => {
            this.createConnection();
        }, delay);
    }

    private startPing(): void {
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, this.config.pingInterval);
    }

    private stopPing(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    private startHeartbeatMonitor(): void {
        // Check heartbeat every 15 seconds
        this.heartbeatTimeout = setInterval(() => {
            const timeSinceLastMessage = Date.now() - this.lastMessageTime;

            // If no message received within timeout period, connection may be stale
            if (timeSinceLastMessage > this.config.heartbeatTimeout) {
                console.warn(`No messages received for ${timeSinceLastMessage}ms. Connection may be stale.`);

                // Mark as degraded first
                if (this.connectionQuality === 'connected') {
                    this.updateConnectionQuality('degraded');
                }

                // If WebSocket still appears open but is stale, force reconnection
                if (this.ws?.readyState === WebSocket.OPEN) {
                    console.log('Forcing reconnection due to stale connection');
                    this.ws.close();
                }
            }
        }, 15000); // Check every 15 seconds
    }

    private stopHeartbeatMonitor(): void {
        if (this.heartbeatTimeout) {
            clearInterval(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }

    private cleanup(): void {
        this.stopPing();

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.notifyStatusHandlers(false);
    }
}

// Singleton instance for app-wide use
let wsClient: NotificationWebSocket | null = null;

export function getWebSocketClient(config?: WebSocketClientConfig): NotificationWebSocket {
    if (!wsClient) {
        wsClient = new NotificationWebSocket(config);
    }
    return wsClient;
}
