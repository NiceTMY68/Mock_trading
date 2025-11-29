import { useEffect, useMemo } from 'react';
import { useGlobalWebSocket } from '../contexts/WebSocketContext';

/**
 * Hook to get realtime prices using the global WebSocket context
 * @param symbols - Array of symbols to subscribe to (e.g., ['BTCUSDT', 'ETHUSDT'])
 */
export const useRealtimePrices = (symbols: string[] = []) => {
  const { prices, isConnected, subscribe, unsubscribe } = useGlobalWebSocket();

  // Memoize symbols to prevent unnecessary re-renders
  const normalizedSymbols = useMemo(() => 
    symbols.filter(s => s && s.trim()).map(s => s.toUpperCase().trim()),
    [symbols.join(',')]
  );

  // Subscribe to symbols when they change
  useEffect(() => {
    if (normalizedSymbols.length > 0) {
      subscribe(normalizedSymbols);
      return () => {
        unsubscribe(normalizedSymbols);
      };
    }
  }, [normalizedSymbols, subscribe, unsubscribe]);

  return {
    prices,
    isConnected,
    getPrice: (symbol: string) => prices[symbol.toUpperCase()]
  };
};
