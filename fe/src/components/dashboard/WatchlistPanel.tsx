import { useState, useEffect } from 'react';
import { useWatchlistStore, useWatchlists, useWatchlistSymbols } from '../../store/watchlist';
import { useAuthStore } from '../../store/auth';
import { formatCurrency, formatPercent, humanizeSymbol } from '../../utils/format';
import { useRealtimePrices } from '../../hooks/useRealtimePrices';

const WatchlistPanel = () => {
  const [input, setInput] = useState('');
  const { isAuthenticated } = useAuthStore();
  
  // For authenticated users: use watchlists from backend
  const {
    watchlists,
    activeWatchlistId,
    setActiveWatchlist,
    addSymbol: addSymbolToWatchlist,
    removeSymbol: removeSymbolFromWatchlist,
    createWatchlist,
    deleteWatchlist,
    isLoading
  } = useWatchlists();

  // For anonymous users: use local storage
  const legacyAddSymbol = useWatchlistStore((state) => state.addSymbol);
  const legacyRemoveSymbol = useWatchlistStore((state) => state.removeSymbol);
  const setSelectedSymbol = useWatchlistStore((state) => state.setSelectedSymbol);

  // Get symbols based on auth status
  const symbols = useWatchlistSymbols();
  const activeWatchlist = Array.isArray(watchlists) 
    ? watchlists.find((w: any) => w.id === activeWatchlistId)
    : null;

  // Use realtime prices
  const { prices: realtimePrices, isConnected } = useRealtimePrices(symbols);

  const handleAdd = async () => {
    if (!input.trim()) return;
    const normalized = input.toUpperCase().trim();
    
    if (isAuthenticated && activeWatchlistId) {
      // Add to active watchlist
      addSymbolToWatchlist({ id: activeWatchlistId, symbol: normalized });
    } else if (!isAuthenticated) {
      // Legacy: add to local storage
      legacyAddSymbol(normalized);
    }
    
    setSelectedSymbol(normalized);
    setInput('');
  };

  const handleRemove = (symbol: string) => {
    if (isAuthenticated && activeWatchlistId) {
      removeSymbolFromWatchlist({ id: activeWatchlistId, symbol });
    } else {
      legacyRemoveSymbol(symbol);
    }
  };

  const handleCreateWatchlist = () => {
    const name = prompt('Enter watchlist name:');
    if (name) {
      createWatchlist({ name });
    }
  };

  const handleExportCSV = () => {
    if (symbols.length === 0) {
      alert('No symbols to export');
      return;
    }

    const csvRows = [
      ['Symbol', 'Price', '24h Change %', 'Volume'].join(','),
      ...symbols.map(symbol => {
        const priceData = realtimePrices[symbol];
        return [
          symbol,
          priceData ? priceData.price.toFixed(8) : 'N/A',
          priceData ? priceData.priceChangePercent.toFixed(2) + '%' : 'N/A',
          priceData ? priceData.volume.toFixed(2) : 'N/A'
        ].join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watchlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Watchlist</p>
          <h3 className="text-xl font-semibold text-white">Personal Radar</h3>
        </div>
        {isAuthenticated && (
          <div className="flex gap-2">
            {Array.isArray(watchlists) && watchlists.length > 1 && (
              <select
                value={activeWatchlistId || ''}
                onChange={(e) => setActiveWatchlist(Number(e.target.value))}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white outline-none focus:border-emerald-400"
              >
                {watchlists.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.symbols?.length || 0})
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleCreateWatchlist}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white hover:border-emerald-400 transition"
            >
              + New
            </button>
            {symbols.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white hover:border-emerald-400 transition"
                title="Export to CSV"
              >
                📥 Export
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAdd();
            }
          }}
          placeholder="Add symbol e.g. BTCUSDT"
          className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none"
        />
        <button
          onClick={handleAdd}
          className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition"
        >
          Add
        </button>
      </div>

      {!isAuthenticated && (
        <div className="mt-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-300">
          💡 <a href="/login" className="underline">Đăng nhập</a> để lưu watchlist và sync trên nhiều thiết bị
        </div>
      )}

      {!isConnected && symbols.length > 0 && (
        <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-300">
          ⚠️ Backend not connected. Prices will update when backend is available.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading watchlist...</div>
        ) : symbols.length === 0 ? (
          <p className="text-sm text-slate-500">Add symbols to start tracking.</p>
        ) : (
          symbols.map((symbol) => {
            const priceData = realtimePrices[symbol];
            return (
              <div
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 cursor-pointer transition hover:border-emerald-300 hover:bg-white/10"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{humanizeSymbol(symbol)}</p>
                  <p className="text-xs text-slate-400">
                    {priceData ? `${formatCurrency(priceData.price)}` : 'Loading price...'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-semibold ${
                      priceData && priceData.priceChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {priceData ? formatPercent(priceData.priceChangePercent) : '--'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(symbol);
                    }}
                    className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300 hover:border-rose-300 hover:text-rose-200 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isAuthenticated && activeWatchlist && Array.isArray(activeWatchlist.symbols) && activeWatchlist.symbols.length === 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-500 mb-2">This watchlist is empty</p>
          {Array.isArray(watchlists) && watchlists.length > 1 && (
            <button
              onClick={() => deleteWatchlist(activeWatchlistId!)}
              className="text-xs text-rose-400 hover:text-rose-300"
            >
              Delete watchlist
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default WatchlistPanel;
