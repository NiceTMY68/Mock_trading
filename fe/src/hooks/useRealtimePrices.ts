import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAuthStore } from '../store/auth';

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

type PriceMap = Record<string, PriceUpdate>;

export const useRealtimePrices = (symbols: string[] = []) => {
  const [prices, setPrices] = useState<PriceMap>({});
  const [isConnected, setIsConnected] = useState(false);

  const handleMessage = useCallback((message: any) => {
    if (message.type === 'price') {
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
      
      // Debug log in development
      if (import.meta.env.DEV) {
        console.log(`📊 Price update: ${update.symbol} = $${update.price} (${update.priceChangePercent > 0 ? '+' : ''}${update.priceChangePercent.toFixed(2)}%)`);
      }
    } else if (message.type === 'connected') {
      setIsConnected(true);
      console.log('✅ WebSocket connected to price stream');
    } else if (message.type === 'subscribed') {
      console.log('✅ Subscribed to symbols:', message.symbols);
    }
  }, []);

  const { token } = useAuthStore();
  
  const { isConnected: wsConnected, subscribe, unsubscribe } = useWebSocket({
    token: token || null,
    onMessage: handleMessage,
    onConnect: () => setIsConnected(true),
    onDisconnect: () => setIsConnected(false)
  });

  useEffect(() => {
    // Only subscribe if WebSocket is connected
    if (wsConnected && symbols.length > 0) {
      subscribe(symbols);
      return () => {
        if (wsConnected) {
          unsubscribe(symbols);
        }
      };
    }
  }, [wsConnected, symbols, subscribe, unsubscribe]);

  return {
    prices,
    isConnected: wsConnected && isConnected,
    getPrice: (symbol: string) => prices[symbol.toUpperCase()]
  };
};

