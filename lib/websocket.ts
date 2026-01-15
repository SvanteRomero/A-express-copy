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

export type WebSocketMessage = SchedulerNotificationMessage | ConnectionMessage | PongMessage;

export type MessageHandler = (message: WebSocketMessage) => void;
export type ConnectionStatusHandler = (isConnected: boolean) => void;

export interface WebSocketClientConfig {
    baseUrl?: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    pingInterval?: number;
}

/**
 * Get the WebSocket base URL from the API URL.
 * Converts http://localhost:8000/api to ws://localhost:8000
 */
function getWebSocketBaseUrl(): string {
    if (typeof window === 'undefined') {
        return 'ws://localhost:8000';
    }

    // Try to get from environment variable first
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
        // Convert http(s)://host/api to ws(s)://host
        const url = new URL(apiUrl);
        const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsProtocol}//${url.host}`;
    }

    // For local development, use Django's default port
    const host = window.location.hostname;

    // Check for cloud development environments
    if (host.includes('github.dev') || host.includes('gitpod.io')) {
        // Replace frontend port with backend port
        if (host.includes('-3000')) {
            const backendHost = host.replace('-3000', '-8000');
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
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
};

/**
 * WebSocket client class for managing notification connections.
 * Handles connection, reconnection, authentication, and message handling.
 */
export class NotificationWebSocket {
    private ws: WebSocket | null = null;
    private messageHandlers: Set<MessageHandler> = new Set();
    private statusHandlers: Set<ConnectionStatusHandler> = new Set();
    private reconnectAttempts = 0;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private pingInterval: ReturnType<typeof setInterval> | null = null;
    private config: Required<WebSocketClientConfig>;
    private token: string | null = null;
    private isIntentionalClose = false;

    constructor(config: WebSocketClientConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Connect to the WebSocket server with JWT authentication.
     */
    connect(token: string): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.debug('WebSocket already connected');
            return;
        }

        this.token = token;
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
     * Check if WebSocket is connected.
     */
    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    private createConnection(): void {
        if (!this.token) {
            console.error('Cannot connect: no token provided');
            return;
        }

        const wsUrl = `${this.config.baseUrl}/ws/notifications/?token=${this.token}`;

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
            this.notifyStatusHandlers(true);
            this.startPing();
        };

        this.ws.onclose = (event) => {
            console.debug(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
            this.notifyStatusHandlers(false);
            this.stopPing();

            if (!this.isIntentionalClose) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as WebSocketMessage;
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

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
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
