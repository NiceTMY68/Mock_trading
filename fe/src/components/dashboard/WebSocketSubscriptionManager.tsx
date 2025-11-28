import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../store/auth';
import { useWatchlistSymbols } from '../../store/watchlist';
import { formatCurrency, formatPercent, humanizeSymbol } from '../../utils/format';
import { SignalIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

type SubscriptionStatus = {
  symbol: string;
  subscribedAt: number;
  lastUpdate?: number;
  updateCount: number;
  price?: number;
  priceChangePercent?: number;
};

const WebSocketSubscriptionManager = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [subscribedSymbols, setSubscribedSymbols] = useState<Set<string>>(new Set());
  const [subscriptionStatus, setSubscriptionStatus] = useState<Map<string, SubscriptionStatus>>(new Map());
  const [inputSymbol, setInputSymbol] = useState('');
  const [error, setError] = useState<string | null>(null);
  const updateCountRef = useRef<Map<string, number>>(new Map());
  const lastUpdateRef = useRef<Map<string, number>>(new Map());

  // Get subscription limit based on role
  const subscriptionLimit = user?.role === 'admin' ? Infinity : user?.role === 'user' ? 25 : 5;
  const watchlistSymbols = useWatchlistSymbols();

  const handleMessage = useCallback((message: any) => {
    if (message.type === 'price') {
      const symbol = (message.symbol || '').toUpperCase();
      const now = Date.now();
      
      setSubscriptionStatus((prev) => {
        const status = prev.get(symbol);
        if (status) {
          const newStatus = {
            ...status,
            lastUpdate: now,
            updateCount: status.updateCount + 1,
            price: message.price,
            priceChangePercent: message.priceChangePercent
          };
          const updated = new Map(prev);
          updated.set(symbol, newStatus);
          return updated;
        }
        return prev;
      });

      updateCountRef.current.set(symbol, (updateCountRef.current.get(symbol) || 0) + 1);
      lastUpdateRef.current.set(symbol, now);
    } else if (message.type === 'subscribed') {
      const symbols = (message.symbols || []).map((s: string) => s.toUpperCase());
      setSubscribedSymbols(new Set(symbols));
      setError(null);
      
      // Initialize status for new subscriptions
      setSubscriptionStatus((prev) => {
        const updated = new Map(prev);
        symbols.forEach((symbol: string) => {
          if (!updated.has(symbol)) {
            updated.set(symbol, {
              symbol,
              subscribedAt: Date.now(),
              updateCount: 0
            });
          }
        });
        return updated;
      });
    } else if (message.type === 'unsubscribed') {
      const symbols = (message.symbols || []).map((s: string) => s.toUpperCase());
      setSubscribedSymbols((prev) => {
        const updated = new Set(prev);
        symbols.forEach((symbol: string) => updated.delete(symbol));
        return updated;
      });
      
      setSubscriptionStatus((prev) => {
        const updated = new Map(prev);
        symbols.forEach((symbol: string) => updated.delete(symbol));
        return updated;
      });
    } else if (message.type === 'error') {
      setError(message.message || 'Unknown error');
    }
  }, []);

  const { token } = useAuthStore();
  const { isConnected, subscribe, unsubscribe, connect, disconnect, lastMessage } = useWebSocket({
    token: token || null,
    onMessage: handleMessage,
    autoConnect: true
  });

  // Update status when lastMessage changes
  useEffect(() => {
    if (lastMessage) {
      handleMessage(lastMessage);
    }
  }, [lastMessage, handleMessage]);

  // Auto-subscribe to watchlist symbols when connected (only if not already subscribed)
  useEffect(() => {
    if (isConnected && watchlistSymbols.length > 0 && subscribedSymbols.size === 0) {
      const symbolsToSubscribe = watchlistSymbols
        .filter(s => s && s.trim())
        .slice(0, subscriptionLimit)
        .map(s => s.toUpperCase().trim());
      
      if (symbolsToSubscribe.length > 0) {
        subscribe(symbolsToSubscribe);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, watchlistSymbols.length, subscriptionLimit]);

  const handleSubscribe = (symbol: string) => {
    const normalized = symbol.toUpperCase().trim();
    if (!normalized) return;

    if (subscribedSymbols.has(normalized)) {
      setError(`${normalized} is already subscribed`);
      return;
    }

    if (subscribedSymbols.size >= subscriptionLimit) {
      setError(`Maximum ${subscriptionLimit} subscriptions allowed for your account type`);
      return;
    }

    subscribe([normalized]);
    setInputSymbol('');
    setError(null);
  };

  const handleUnsubscribe = (symbol: string) => {
    unsubscribe([symbol]);
    setError(null);
  };

  const handleUnsubscribeAll = () => {
    if (subscribedSymbols.size === 0) return;
    unsubscribe(Array.from(subscribedSymbols));
  };

  const getUpdateRate = (symbol: string): number => {
    const status = subscriptionStatus.get(symbol);
    if (!status || !status.lastUpdate || status.updateCount === 0) return 0;
    
    const timeDiff = (Date.now() - status.subscribedAt) / 1000; // seconds
    if (timeDiff === 0) return 0;
    return status.updateCount / timeDiff; // updates per second
  };

  const getConnectionStatusColor = () => {
    if (!isConnected) return 'bg-rose-400/20 text-rose-300 border-rose-400/30';
    return 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30';
  };

  const getConnectionStatusText = () => {
    if (!isConnected) return 'Disconnected';
    return `Connected (${subscribedSymbols.size}/${subscriptionLimit === Infinity ? '∞' : subscriptionLimit})`;
  };

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">WebSocket</p>
          <h3 className="text-xl font-semibold text-white">Price Stream</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-xs rounded-full border ${getConnectionStatusColor()}`}>
            <SignalIcon className="inline w-3 h-3 mr-1" />
            {getConnectionStatusText()}
          </span>
        </div>
      </div>

      {/* Connection Controls */}
      <div className="mb-4 flex gap-2">
        {!isConnected ? (
          <button
            onClick={() => connect()}
            className="flex-1 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition"
          >
            Connect
          </button>
        ) : (
          <button
            onClick={() => disconnect()}
            className="flex-1 rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-300 hover:bg-rose-400/20 transition"
          >
            Disconnect
          </button>
        )}
        {subscribedSymbols.size > 0 && (
          <button
            onClick={handleUnsubscribeAll}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:border-amber-400 transition"
          >
            Unsubscribe All
          </button>
        )}
      </div>

      {/* Add Symbol */}
      {isConnected && subscribedSymbols.size < subscriptionLimit && (
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubscribe(inputSymbol);
              }
            }}
            placeholder="Add symbol (e.g. BTCUSDT)"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none"
          />
          <button
            onClick={() => handleSubscribe(inputSymbol)}
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Subscription Limit Warning */}
      {subscribedSymbols.size >= subscriptionLimit && (
        <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-300">
          ⚠️ Subscription limit reached ({subscriptionLimit}). Unsubscribe from symbols to add new ones.
        </div>
      )}

      {/* Subscribed Symbols List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {subscribedSymbols.size === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            {isConnected ? 'No symbols subscribed. Add symbols above.' : 'Connect to start subscribing to price updates.'}
          </div>
        ) : (
          Array.from(subscribedSymbols).map((symbol) => {
            const status = subscriptionStatus.get(symbol);
            const updateRate = getUpdateRate(symbol);
            const timeSinceUpdate = status?.lastUpdate 
              ? Math.floor((Date.now() - status.lastUpdate) / 1000) 
              : null;

            return (
              <div
                key={symbol}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3 hover:border-emerald-400/50 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white">{humanizeSymbol(symbol)}</p>
                    {status?.price && (
                      <span className={`text-xs font-semibold ${
                        status.priceChangePercent && status.priceChangePercent >= 0 
                          ? 'text-emerald-400' 
                          : 'text-rose-400'
                      }`}>
                        {formatPercent(status.priceChangePercent || 0)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {status?.price && (
                      <span>{formatCurrency(status.price)}</span>
                    )}
                    {updateRate > 0 && (
                      <span>~{updateRate.toFixed(1)} updates/s</span>
                    )}
                    {status?.updateCount !== undefined && (
                      <span>{status.updateCount} updates</span>
                    )}
                    {timeSinceUpdate !== null && timeSinceUpdate < 60 && (
                      <span className="text-emerald-400">● Live</span>
                    )}
                    {timeSinceUpdate !== null && timeSinceUpdate >= 60 && (
                      <span className="text-amber-400">⚠ Stale ({timeSinceUpdate}s ago)</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleUnsubscribe(symbol)}
                  className="ml-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-400/20 transition"
                  title="Unsubscribe"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Info Footer */}
      {isAuthenticated && (
        <div className="mt-4 pt-4 border-t border-white/5 text-xs text-slate-500">
          <p>Subscription limit: {subscriptionLimit === Infinity ? 'Unlimited' : `${subscriptionLimit} symbols`}</p>
          <p className="mt-1">Role: {user?.role || 'anonymous'}</p>
        </div>
      )}
    </section>
  );
};

export default WebSocketSubscriptionManager;

