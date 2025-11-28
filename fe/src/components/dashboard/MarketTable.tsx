import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketList, fetchQuoteAssets } from '../../api/market';
import { MarketCoin, MarketListResponse } from '../../types';
import { formatCurrency, formatPercent, humanizeSymbol } from '../../utils/format';
import { useWatchlistStore } from '../../store/watchlist';
import { useAuthStore } from '../../store/auth';
import { useRealtimePrices } from '../../hooks/useRealtimePrices';
import MarketFilters, { MarketFilters as MarketFiltersType } from './MarketFilters';
import LoginModal from '../auth/LoginModal';

const headClass = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400';
const cellClass = 'px-4 py-3 text-sm text-slate-100';

const MarketTable = () => {
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState('volume');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const [filters, setFilters] = useState<MarketFiltersType>({
    quote: null,
    minMarketCap: null,
    maxMarketCap: null,
    minVolume: null,
    maxVolume: null,
    minTradeCount: null,
    maxTradeCount: null
  });
  const addSymbol = useWatchlistStore((state) => state.addSymbol);
  const setSelectedSymbol = useWatchlistStore((state) => state.setSelectedSymbol);

  const { data, isLoading } = useQuery<MarketListResponse>({
    queryKey: ['market-list', page, sortBy, filters],
    queryFn: () =>
      fetchMarketList({
        page,
        size: 12,
        sortBy,
        ...filters
      }),
    placeholderData: (previousData) => previousData, // React Query v5 replacement for keepPreviousData
    staleTime: 30_000, // Consider data fresh for 30 seconds
    refetchInterval: 120_000 // Refetch every 2 minutes
  });

  const { data: quotes } = useQuery({
    queryKey: ['market-quotes'],
    queryFn: fetchQuoteAssets,
    staleTime: Infinity
  });

  const totalPages = data?.pagination?.pages ?? 1;

  // Get symbols for realtime updates
  const symbols = useMemo(() => {
    return data?.items?.map((coin: MarketCoin) => coin.symbol) ?? [];
  }, [data?.items]);

  // Subscribe to realtime prices
  const { prices: realtimePrices } = useRealtimePrices(symbols);

  // Merge realtime prices with static data
  const rows: (MarketCoin | undefined)[] = useMemo(() => {
    if (isLoading) return Array.from({ length: 12 }) as undefined[];
    if (!data?.items) return [];
    return (
      data.items.map((coin: MarketCoin) => {
        const realtime = realtimePrices[coin.symbol];
        if (realtime) {
          return {
            ...coin,
            lastPrice: realtime.price, // Update lastPrice with realtime price
            priceChangePercent: realtime.priceChangePercent,
            volume: realtime.volume,
            quoteVolume: realtime.volume * realtime.price // Update quoteVolume
          };
        }
        return coin;
      })
    );
  }, [data?.items, realtimePrices, isLoading]);

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 shadow-2xl shadow-black/50">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Market Board</p>
          <h2 className="text-2xl font-semibold text-white">Binance Spot Pairs</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {quotes && <MarketFilters quotes={quotes} filters={filters} onFiltersChange={setFilters} />}
          
          <select
            value={sortBy}
            onChange={(e) => {
              setPage(0);
              setSortBy(e.target.value);
            }}
            className="rounded-full border border-white/10 bg-transparent px-4 py-2 text-sm text-white outline-none focus:border-emerald-400"
          >
            <option value="volume">Volume</option>
            <option value="count">Trades</option>
            <option value="gainers">Top gainers</option>
            <option value="losers">Top losers</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/5">
        <table className="min-w-full divide-y divide-white/5">
          <thead>
            <tr>
              <th className={headClass}>Pair</th>
              <th className={headClass}>Last Price</th>
              <th className={headClass}>24h %</th>
              <th className={headClass}>Volume (24h)</th>
              <th className={headClass}>Market Cap</th>
              <th className={headClass}>Trades</th>
              <th className={headClass}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((coin, index) => (
              <tr key={coin?.symbol ?? index} className="hover:bg-white/5 cursor-pointer" onClick={() => {
                if (coin) {
                  const { navigate } = require('../../utils/navigation');
                  navigate(`/coin/${coin.symbol}`);
                }
              }}>
                <td className={`${cellClass} font-semibold`}>
                  {coin ? (
                    <>
                      {humanizeSymbol(coin.symbol)}
                      <span className="ml-2 text-xs text-slate-400">{coin.baseAsset}</span>
                    </>
                  ) : (
                    <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                  )}
                </td>
                <td className={cellClass}>
                  {coin ? (
                    `$${coin.lastPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
                  ) : (
                    <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
                  )}
                </td>
                <td className={`${cellClass} font-semibold`}>
                  {coin ? (
                    <span className={coin.priceChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {formatPercent(coin.priceChangePercent)}
                    </span>
                  ) : (
                    <div className="h-4 w-12 animate-pulse rounded bg-white/10" />
                  )}
                </td>
                <td className={cellClass}>
                  {coin ? formatCurrency(coin.quoteVolume) : <div className="h-4 w-20 animate-pulse rounded bg-white/10" />}
                </td>
                <td className={cellClass}>
                  {coin ? (
                    coin.marketCap ? (
                      formatCurrency(coin.marketCap)
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )
                  ) : (
                    <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
                  )}
                </td>
                <td className={cellClass}>{coin ? coin.count.toLocaleString() : <div className="h-4 w-10 animate-pulse rounded bg-white/10" />}</td>
                <td className={cellClass}>
                  {coin ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isAuthenticated) {
                          setShowLoginModal(true);
                        } else {
                          addSymbol(coin.symbol);
                          setSelectedSymbol(coin.symbol);
                        }
                      }}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:border-emerald-300 hover:bg-emerald-400/10"
                    >
                      Track
                    </button>
                  ) : (
                    <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <p>
          Page {page + 1} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            className="rounded-full border border-white/10 px-4 py-2 text-white transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-600"
          >
            Previous
          </button>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded-full border border-white/10 px-4 py-2 text-white transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-600"
          >
            Next
          </button>
        </div>
      </div>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          // After login, add symbol if needed
        }}
      />
    </section>
  );
};

export default MarketTable;

