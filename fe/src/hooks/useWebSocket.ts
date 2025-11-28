import { useEffect, useRef, useState, useCallback } from 'react';

type WebSocketMessage = {
  type: 'connected' | 'price' | 'subscribed' | 'unsubscribed' | 'pong' | 'error';
  [key: string]: any;
};

type UseWebSocketOptions = {
  url?: string;
  token?: string | null;
  autoConnect?: boolean;
  checkBackendFirst?: boolean; // Check backend health before connecting
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

// Get backend URL from environment or default
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000';
const WS_URL = BACKEND_URL.replace('http', 'ws') + '/ws/prices';

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    url,
    token,
    autoConnect = true,
    checkBackendFirst = true,
    onMessage,
    onError,
    onConnect,
    onDisconnect
  } = options;
  
  const backendCheckedRef = useRef(false);
  const backendAvailableRef = useRef(false);

  const wsUrl = url || `${WS_URL}${token ? `?token=${token}` : ''}`;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;
  const isConnectingRef = useRef(false);
  const shouldReconnectRef = useRef(true);
  const hasWarnedRef = useRef(false); // Track if we've already warned about connection issues
  
  const isDev = import.meta.env.DEV;

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Stop reconnecting if max attempts reached
    if (!shouldReconnectRef.current || reconnectAttemptsRef.current >= maxReconnectAttempts) {
      // Only warn once when max attempts reached
      if (reconnectAttemptsRef.current >= maxReconnectAttempts && !hasWarnedRef.current && isDev) {
        console.warn('WebSocket: Max reconnection attempts reached. Backend may be unavailable.');
        hasWarnedRef.current = true;
      }
      return;
    }

    isConnectingRef.current = true;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          isConnectingRef.current = false;
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        shouldReconnectRef.current = true;
        hasWarnedRef.current = false; // Reset warning flag on successful connection
        if (isDev) {
          console.log('✅ WebSocket connected to', wsUrl);
        }
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          if (isDev && message.type === 'price') {
            console.log('📊 Price update received:', message.symbol, message.price);
          }
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        // Only log error once, not on every reconnect attempt
        if (isDev && reconnectAttemptsRef.current === 0 && !hasWarnedRef.current) {
          console.warn('WebSocket connection error. Backend may not be running.');
          hasWarnedRef.current = true;
        }
        onError?.(error);
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        setIsConnected(false);
        onDisconnect?.();

        // Only reconnect if it wasn't a manual close and we should reconnect
        if (shouldReconnectRef.current && event.code !== 1000) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            // Check backend before reconnecting
            const checkAndReconnect = async () => {
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const response = await fetch('http://localhost:3000/health', { 
                  signal: controller.signal 
                });
                clearTimeout(timeoutId);
                // Accept both 200 (ok) and 503 (degraded but running)
                const isResponsive = response.status === 200 || response.status === 503;
                if (isResponsive) {
                  backendAvailableRef.current = true;
                  connect();
                } else {
                  backendAvailableRef.current = false;
                  reconnectTimeoutRef.current = setTimeout(checkAndReconnect, reconnectDelay * reconnectAttemptsRef.current);
                }
              } catch {
                backendAvailableRef.current = false;
                reconnectTimeoutRef.current = setTimeout(checkAndReconnect, reconnectDelay * reconnectAttemptsRef.current);
              }
            };
            reconnectTimeoutRef.current = setTimeout(checkAndReconnect, reconnectDelay * reconnectAttemptsRef.current);
          } else {
            // Only warn once when stopping reconnection
            if (!hasWarnedRef.current && isDev) {
              console.warn('WebSocket: Stopped attempting to reconnect. Please check if backend is running.');
              hasWarnedRef.current = true;
            }
            shouldReconnectRef.current = false;
          }
        }
      };
    } catch (error) {
      isConnectingRef.current = false;
      if (isDev) {
        console.error('Error creating WebSocket:', error);
      }
      onError?.(error as Event);
    }
  }, [wsUrl, onMessage, onError, onConnect, onDisconnect]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
    isConnectingRef.current = false;
  }, []);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
    // Silently fail if not connected - no console warnings
  }, []);

  const subscribe = useCallback(
    (symbols: string[]) => {
      send({ action: 'subscribe', symbols });
    },
    [send]
  );

  const unsubscribe = useCallback(
    (symbols: string[]) => {
      send({ action: 'unsubscribe', symbols });
    },
    [send]
  );

  const ping = useCallback(() => {
    send({ action: 'ping' });
  }, [send]);

  // Check backend availability before connecting
  useEffect(() => {
    if (!autoConnect || !checkBackendFirst) {
      if (autoConnect) {
        if (isDev) console.log('🔌 WebSocket: Auto-connecting without health check...');
        connect();
      }
      return;
    }

    const checkBackend = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased timeout
        
        const healthUrl = `${BACKEND_URL}/health`;
        if (isDev) console.log(`🔍 WebSocket: Checking backend health at ${healthUrl}...`);
        
        const response = await fetch(healthUrl, {
          signal: controller.signal,
          method: 'GET'
        });
        
        clearTimeout(timeoutId);
        
        // Check if backend is responsive, even if degraded (503)
        // This allows WebSocket to connect even if Redis is unavailable
        const isBackendResponsive = response.status === 200 || response.status === 503;
        backendAvailableRef.current = isBackendResponsive;
        backendCheckedRef.current = true;
        
        if (isBackendResponsive) {
          if (isDev) {
            const data = await response.json();
            console.log('✅ WebSocket: Backend is responsive, connecting...', data.status);
          }
          connect();
        } else {
          if (isDev) console.warn(`⚠️ WebSocket: Backend health check failed with status ${response.status}`);
        }
      } catch (error: any) {
        backendAvailableRef.current = false;
        backendCheckedRef.current = true;
        if (isDev) console.warn('⚠️ WebSocket: Backend not available:', error.message || 'Connection failed');
      }
    };

    checkBackend();
    
    // Recheck backend every 5 seconds if not connected
    const interval = setInterval(() => {
      if (!backendAvailableRef.current && !isConnectingRef.current && !wsRef.current) {
        checkBackend();
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      disconnect();
    };
  }, [autoConnect, checkBackendFirst, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    ping
  };
};

