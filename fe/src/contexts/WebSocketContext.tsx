import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/auth';

type WebSocketMessage = {
  type: 'connected' | 'price' | 'subscribed' | 'unsubscribed' | 'pong' | 'error';
  [key: string]: any;
};

type PriceUpdate = {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  priceChange: number;
  priceChangePercent: number;
  timestamp: string;
};

type WebSocketContextValue = {
  isConnected: boolean;
  prices: Record<string, PriceUpdate>;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  connect: () => void;
  disconnect: () => void;
};

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// Get backend URL from environment or default
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000';
const WS_URL = BACKEND_URL.replace('http', 'ws') + '/ws/prices';
const isDev = import.meta.env.DEV;

// Set to false to disable WebSocket connection (for development without realtime prices)
const ENABLE_WEBSOCKET = false;

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const pendingSymbolsRef = useRef<Set<string>>(new Set());
  const maxReconnectAttempts = 10;
  const reconnectDelay = 2000;
  const isConnectingRef = useRef(false);
  const hasConnectedOnceRef = useRef(false);

  const connect = useCallback(() => {
    // Check if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      if (isDev) console.log('🔌 WebSocket already connected');
      return;
    }

    // Check if already connecting
    if (isConnectingRef.current) {
      if (isDev) console.log('⏳ WebSocket connection in progress...');
      return;
    }

    // Check if max attempts reached
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      if (isDev) console.log('❌ Max reconnection attempts reached');
      return;
    }

    isConnectingRef.current = true;
    const wsUrl = `${WS_URL}${token ? `?token=${token}` : ''}`;
    
    if (isDev) {
      console.log('🔌 Creating WebSocket connection to:', wsUrl);
    }

    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          if (isDev) console.log('⏰ WebSocket connection timeout');
          ws.close();
          isConnectingRef.current = false;
          // Try reconnect
          reconnectAttemptsRef.current++;
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            setTimeout(connect, reconnectDelay);
          }
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        hasConnectedOnceRef.current = true;
        
        if (isDev) {
          console.log('✅ Global WebSocket CONNECTED!');
        }

        // Send any pending subscriptions
        const allSymbols = new Set([
          ...Array.from(subscribedSymbolsRef.current),
          ...Array.from(pendingSymbolsRef.current)
        ]);
        
        if (allSymbols.size > 0) {
          const symbols = Array.from(allSymbols);
          if (isDev) console.log('📤 Sending pending subscriptions:', symbols.join(', '));
          ws.send(JSON.stringify({ action: 'subscribe', symbols }));
          pendingSymbolsRef.current.clear();
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'connected') {
            if (isDev) console.log('🔌 Server welcome message received');
          } else if (message.type === 'price') {
            const update: PriceUpdate = {
              symbol: (message.symbol || '').toUpperCase(),
              price: message.price || 0,
              open: message.open || 0,
              high: message.high || 0,
              low: message.low || 0,
              close: message.close || 0,
              volume: message.volume || 0,
              priceChange: message.priceChange || 0,
              priceChangePercent: message.priceChangePercent || 0,
              timestamp: message.timestamp || message.sentAt || new Date().toISOString()
            };

            setPrices((prev) => ({
              ...prev,
              [update.symbol]: update
            }));

            if (isDev) {
              console.log(`📊 ${update.symbol}: $${update.price.toFixed(2)} (${update.priceChangePercent >= 0 ? '+' : ''}${update.priceChangePercent.toFixed(2)}%)`);
            }
          } else if (message.type === 'subscribed') {
            const symbols = (message.symbols || []).map((s: string) => s.toUpperCase());
            symbols.forEach((sym: string) => subscribedSymbolsRef.current.add(sym));
            if (isDev) {
              console.log('✅ Server confirmed subscription:', symbols.join(', '));
            }
          } else if (message.type === 'unsubscribed') {
            const symbols = (message.symbols || []).map((s: string) => s.toUpperCase());
            symbols.forEach((sym: string) => subscribedSymbolsRef.current.delete(sym));
            if (isDev) {
              console.log('❌ Unsubscribed from:', symbols.join(', '));
            }
          } else if (message.type === 'error') {
            console.error('❌ WebSocket error from server:', message.message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        if (isDev) {
          console.error('⚠️ WebSocket error:', error);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        setIsConnected(false);

        if (isDev) {
          console.log(`🔌 WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'none'}`);
        }

        // Auto reconnect if not intentionally closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = reconnectDelay * Math.min(reconnectAttemptsRef.current, 5);
          if (isDev) {
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          }
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
    } catch (error) {
      isConnectingRef.current = false;
      if (isDev) {
        console.error('Error creating WebSocket:', error);
      }
      // Try reconnect
      reconnectAttemptsRef.current++;
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        setTimeout(connect, reconnectDelay);
      }
    }
  }, [token]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    
    isConnectingRef.current = false;
    setIsConnected(false);
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    if (symbols.length === 0) return;
    
    const normalizedSymbols = symbols.map(s => s.toUpperCase());
    
    // Add to subscribed set
    normalizedSymbols.forEach(sym => subscribedSymbolsRef.current.add(sym));
    
    // If WebSocket is open, send subscribe message
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'subscribe', symbols: normalizedSymbols }));
      if (isDev) console.log('📤 Sent subscribe:', normalizedSymbols.join(', '));
    } else {
      // Queue for later
      normalizedSymbols.forEach(sym => pendingSymbolsRef.current.add(sym));
      if (isDev) {
        console.log('⏳ WebSocket not open, queued symbols:', normalizedSymbols.join(', '));
      }
    }
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    if (symbols.length === 0) return;
    
    const normalizedSymbols = symbols.map(s => s.toUpperCase());
    
    // Remove from sets
    normalizedSymbols.forEach(sym => {
      subscribedSymbolsRef.current.delete(sym);
      pendingSymbolsRef.current.delete(sym);
    });
    
    // If WebSocket is open, send unsubscribe message
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'unsubscribe', symbols: normalizedSymbols }));
    }
  }, []);

  // Auto-connect on mount (if WebSocket is enabled)
  useEffect(() => {
    // Skip WebSocket connection if disabled
    if (!ENABLE_WEBSOCKET) {
      if (isDev) console.log('⏸️ WebSocket DISABLED (ENABLE_WEBSOCKET=false)');
      return;
    }

    let isMounted = true;

    const checkBackendAndConnect = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const healthUrl = `${BACKEND_URL}/health`;
        if (isDev) console.log(`🔍 Checking backend health at ${healthUrl}...`);
        
        const response = await fetch(healthUrl, {
          signal: controller.signal,
          method: 'GET'
        });
        
        clearTimeout(timeoutId);
        
        // Accept both 200 (healthy) and 503 (degraded but running)
        const isBackendResponsive = response.status === 200 || response.status === 503;
        
        if (isBackendResponsive && isMounted) {
          if (isDev) console.log('✅ Backend is responsive (status:', response.status + '), connecting WebSocket...');
          connect();
        } else if (isDev) {
          console.log('❌ Backend returned status:', response.status);
        }
      } catch (error: any) {
        if (isDev && isMounted) {
          console.warn('⚠️ Backend not available:', error.message || 'Connection failed');
        }
      }
    };

    checkBackendAndConnect();

    return () => {
      isMounted = false;
      disconnect();
    };
  }, []); // Remove connect/disconnect from deps to prevent re-running

  const value: WebSocketContextValue = {
    isConnected,
    prices,
    subscribe,
    unsubscribe,
    connect,
    disconnect
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useGlobalWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useGlobalWebSocket must be used within WebSocketProvider');
  }
  return context;
};
