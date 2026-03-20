import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

type EventHandler = (data: unknown) => void;

interface WebSocketMessage {
  type: string;
  payload?: unknown;
  timestamp?: number;
}

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  subscribe: (event: string, handler: EventHandler) => () => void;
  send: (message: unknown) => void;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const WS_RECONNECT_INTERVAL = 5000;
const WS_MAX_RECONNECT_ATTEMPTS = 5;
const WS_PING_INTERVAL = 30000;

export function WebSocketProvider(props: { children: ReactNode }) {
  const { children } = props;
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subscriptionsRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const messageQueueRef = useRef<unknown[]>([]);

  const getWebSocketUrl = useCallback(() => {
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';
    const wsProtocol = API_URL.startsWith('https') ? 'wss' : 'ws';
    const baseUrl = API_URL.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${baseUrl}/ws`;
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const url = `${getWebSocketUrl()}?token=${token || ''}`;
      
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, WS_PING_INTERVAL);

        while (messageQueueRef.current.length > 0) {
          const msg = messageQueueRef.current.shift();
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg));
          }
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (reconnectAttemptsRef.current < WS_MAX_RECONNECT_ATTEMPTS) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, WS_RECONNECT_INTERVAL);
        }
      };

      wsRef.current.onerror = () => {
        setIsConnected(false);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          if (message.type === 'pong') {
            return;
          }

          const handlers = subscriptionsRef.current.get(message.type);
          if (handlers) {
            handlers.forEach((handler) => handler(message.payload));
          }

          const allHandlers = subscriptionsRef.current.get('*');
          if (allHandlers) {
            allHandlers.forEach((handler) => handler(message));
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, [getWebSocketUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const send = useCallback((message: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      messageQueueRef.current.push(message);
    }
  }, []);

  const subscribe = useCallback((event: string, handler: EventHandler) => {
    if (!subscriptionsRef.current.has(event)) {
      subscriptionsRef.current.set(event, new Set());
    }
    
    const handlers = subscriptionsRef.current.get(event);
    if (handlers) {
      handlers.add(handler);
    }

    return () => {
      const h = subscriptionsRef.current.get(event);
      if (h) {
        h.delete(handler);
        if (h.size === 0) {
          subscriptionsRef.current.delete(event);
        }
      }
    };
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return React.createElement(
    WebSocketContext.Provider,
    { value: { isConnected, lastMessage, subscribe, send, reconnect } },
    children
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}

export function useWebSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void
) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(event, (data) => {
      handler(data as T);
    });

    return unsubscribe;
  }, [event, handler, subscribe]);
}
