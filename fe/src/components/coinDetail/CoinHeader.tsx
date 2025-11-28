import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTicker } from '../../api/coinDetail';
import { formatCurrency, formatPercent, humanizeSymbol } from '../../utils/format';
import { useRealtimePrices } from '../../hooks/useRealtimePrices';
import { useWatchlistStore } from '../../store/watchlist';
import { useAuthStore } from '../../store/auth';
import LoginModal from '../auth/LoginModal';
import CreateAlertWidget from './CreateAlertWidget';

interface CoinHeaderProps {
  symbol: string;
}

const CoinHeader = ({ symbol }: CoinHeaderProps) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const { data: ticker, isLoading } = useQuery({
    queryKey: ['ticker', symbol],
    queryFn: () => getTicker(symbol),
    refetchInterval: 30_000
  });

  const { prices } = useRealtimePrices([symbol]);
  const realtimePrice = prices[symbol];
  const addSymbol = useWatchlistStore((state) => state.addSymbol);
  const isInWatchlist = useWatchlistStore((state) => state.symbols.includes(symbol));

  const currentPrice = realtimePrice?.price || ticker?.lastPrice || 0;
  const priceChange = realtimePrice?.priceChangePercent || ticker?.priceChangePercent || 0;
  const isPositive = priceChange >= 0;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 animate-pulse">
        <div className="h-8 bg-white/10 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-white/10 rounded w-1/4"></div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{humanizeSymbol(symbol)}</h1>
            <span className="px-3 py-1 text-sm rounded-full bg-white/5 text-slate-400 border border-white/10">
              {symbol}
            </span>
            {ticker && (
              <span className="px-3 py-1 text-sm rounded-full bg-white/5 text-slate-400 border border-white/10">
                {ticker.baseAsset}/{ticker.quoteAsset}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-4xl font-bold text-white">
              ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </span>
            <span
              className={`text-xl font-semibold ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? '+' : ''}
              {formatPercent(priceChange)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!isAuthenticated) {
                setShowLoginModal(true);
              } else {
                addSymbol(symbol);
              }
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isInWatchlist
                ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                : 'bg-emerald-400 text-slate-900 hover:bg-emerald-300'
            }`}
          >
            {isInWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
          </button>
          {isAuthenticated && (
            <CreateAlertWidget symbol={symbol} currentPrice={currentPrice} />
          )}
        </div>
      </div>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          addSymbol(symbol);
        }}
      />
    </div>
  );
};

export default CoinHeader;

