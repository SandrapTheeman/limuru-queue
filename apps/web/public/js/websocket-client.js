/**
 * Hospital Queue System - WebSocket Client
 * Real-time communication module
 */

(function() {
    'use strict';

    const WSClient = {
        ws: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        reconnectDelay: 3000,
        heartbeatInterval: null,
        listeners: new Map(),

        // Event handlers
        handlers: {
            onConnect: null,
            onDisconnect: null,
            onQueueUpdate: null,
            onNewMessage: null,
            onVoiceCall: null,
            onNotification: null,
            onWaitTimeUpdate: null,
            onError: null
        },

        // Connect to WebSocket server
        connect(token) {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                console.log('[WS] Already connected');
                return;
            }

            const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?token=${token}`;

            try {
                this.ws = new WebSocket(wsUrl);
                this.setupEventHandlers();
            } catch (error) {
                console.error('[WS] Connection failed:', error);
                this.handleError(error);
            }
        },

        // Setup WebSocket event handlers
        setupEventHandlers() {
            if (!this.ws) return;

            this.ws.onopen = () => {
                console.log('[WS] Connected');
                this.reconnectAttempts = 0;
                this.startHeartbeat();
                
                if (this.handlers.onConnect) {
                    this.handlers.onConnect();
                }
            };

            this.ws.onclose = (event) => {
                console.log('[WS] Disconnected:', event.code, event.reason);
                this.stopHeartbeat();
                
                if (this.handlers.onDisconnect) {
                    this.handlers.onDisconnect(event);
                }

                // Attempt reconnection
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`[WS] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);
                    setTimeout(() => this.connect(this.getStoredToken()), this.reconnectDelay);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WS] Error:', error);
                this.handleError(error);
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('[WS] Failed to parse message:', error);
                }
            };
        },

        // Handle incoming messages
        handleMessage(message) {
            console.log('[WS] Message:', message.type || message.event, message);

            switch (message.type || message.event) {
                case 'connected':
                    console.log('[WS] Session established:', message.sessionId);
                    break;

                case 'queue_update':
                    if (this.handlers.onQueueUpdate) {
                        this.handlers.onQueueUpdate(message.data);
                    }
                    this.emit('queueUpdate', message.data);
                    break;

                case 'new_message':
                    if (this.handlers.onNewMessage) {
                        this.handlers.onNewMessage(message.data);
                    }
                    this.emit('newMessage', message.data);
                    // Update unread count
                    this.updateUnreadCount();
                    break;

                case 'voice_call':
                    if (this.handlers.onVoiceCall) {
                        this.handlers.onVoiceCall(message.data);
                    }
                    this.emit('voiceCall', message.data);
                    break;

                case 'notification':
                    if (this.handlers.onNotification) {
                        this.handlers.onNotification(message.data);
                    }
                    this.emit('notification', message.data);
                    break;

                case 'wait_time_update':
                    if (this.handlers.onWaitTimeUpdate) {
                        this.handlers.onWaitTimeUpdate(message.data);
                    }
                    this.emit('waitTimeUpdate', message.data);
                    break;

                case 'pong':
                    // Heartbeat response
                    break;

                default:
                    console.log('[WS] Unknown message type:', message);
            }

            // Emit to all registered listeners
            if (message.event) {
                this.emit(message.event, message.data);
            }
        },

        // Subscribe to department updates
        subscribeToDepartment(departmentId) {
            this.send({
                type: 'subscribe',
                departmentId: departmentId
            });
        },

        // Unsubscribe from department
        unsubscribeFromDepartment(departmentId) {
            this.send({
                type: 'unsubscribe',
                departmentId: departmentId
            });
        },

        // Send message to server
        send(data) {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(data));
            } else {
                console.warn('[WS] Cannot send, not connected');
            }
        },

        // Start heartbeat
        startHeartbeat() {
            this.stopHeartbeat();
            this.heartbeatInterval = setInterval(() => {
                this.send({ type: 'ping' });
            }, 30000);
        },

        // Stop heartbeat
        stopHeartbeat() {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
        },

        // Get stored token
        getStoredToken() {
            return localStorage.getItem('hospital_queue_token');
        },

        // Handle errors
        handleError(error) {
            if (this.handlers.onError) {
                this.handlers.onError(error);
            }
        },

        // Update unread message count
        updateUnreadCount() {
            const badge = document.getElementById('messaging-badge');
            if (badge) {
                const current = parseInt(badge.textContent) || 0;
                badge.textContent = current + 1;
                badge.style.display = 'flex';
            }
        },

        // Event listener management
        on(event, callback) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, new Set());
            }
            this.listeners.get(event).add(callback);
        },

        off(event, callback) {
            if (this.listeners.has(event)) {
                this.listeners.get(event).delete(callback);
            }
        },

        emit(event, data) {
            if (this.listeners.has(event)) {
                this.listeners.get(event).forEach(callback => callback(data));
            }
        },

        // Register event handlers
        registerHandlers(handlers) {
            this.handlers = { ...this.handlers, ...handlers };
        },

        // Disconnect
        disconnect() {
            this.stopHeartbeat();
            if (this.ws) {
                this.ws.close(1000, 'User disconnected');
                this.ws = null;
            }
        },

        // Check connection status
        isConnected() {
            return this.ws && this.ws.readyState === WebSocket.OPEN;
        }
    };

    // Auto-reconnect on network change
    if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
            console.log('[WS] Network online, reconnecting...');
            const token = localStorage.getItem('hospital_queue_token');
            if (token) {
                WSClient.connect(token);
            }
        });

        window.addEventListener('offline', () => {
            console.log('[WS] Network offline');
        });
    }

    // Make globally available
    window.WSClient = WSClient;

})();
