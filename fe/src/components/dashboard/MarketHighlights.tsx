import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tab } from '@headlessui/react';
import { ChartBarIcon, FireIcon, SparklesIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { fetchLosers, fetchNewListings, fetchTopCoins, fetchTrendingCoins } from '../../api/market';
import { MarketCoin } from '../../types';
import { formatCurrency, formatPercent, humanizeSymbol } from '../../utils/format';
import { useWatchlistStore } from '../../store/watchlist';
import { useRealtimePrices } from '../../hooks/useRealtimePrices';
import { navigate } from '../../utils/navigation';

const tabs = [
  {
    id: 'top',
    label: 'Top Volume',
    description: 'Most traded pairs right now',
    icon: ChartBarIcon,
    queryKey: ['market-top-hl'],
    fetcher: () => fetchTopCoins({ limit: 8, sortBy: 'volume' })
  },
  {
    id: 'trending',
    label: 'Trending',
    description: 'Momentum & social buzz',
    icon: FireIcon,
    queryKey: ['market-trending-hl'],
    fetcher: () => fetchTrendingCoins(8)
  },
  {
    id: 'new',
    label: 'New Listings',
    description: 'Fresh pairs on Binance',
    icon: SparklesIcon,
    queryKey: ['market-new-hl'],
    fetcher: () => fetchNewListings({ days: 14, limit: 8 })
  },
  {
    id: 'losers',
    label: 'Market Pullback',
    description: 'Top losers — dip hunters watch',
    icon: ArrowTrendingDownIcon,
    queryKey: ['market-losers-hl'],
    fetcher: () => fetchLosers(8)
  }
];

const MarketHighlights = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const addSymbol = useWatchlistStore((state) => state.addSymbol);
  const setSelectedSymbol = useWatchlistStore((state) => state.setSelectedSymbol);

  const currentTab = tabs[selectedIndex];
  const { data, isLoading } = useQuery({
    queryKey: currentTab.queryKey,
    queryFn: async () => {
      const result = await currentTab.fetcher();
      // Handle different response formats
      if (Array.isArray(result)) return result;
      if (result && typeof result === 'object' && 'items' in result && Array.isArray(result.items)) {
        return result.items;
      }
      return [];
    },
    staleTime: 45_000, // Consider data fresh for 45 seconds
    refetchInterval: 90_000 // Refetch every 1.5 minutes
  });

  // Get symbols for realtime updates
  const symbols = useMemo(() => {
    return (Array.isArray(data) ? data : []).map((coin: MarketCoin) => coin.symbol);
  }, [data]);

  // Subscribe to realtime prices
  const { prices: realtimePrices } = useRealtimePrices(symbols);

  // Merge realtime prices with static data
  const coinsWithRealtime = useMemo(() => {
    if (isLoading || !Array.isArray(data)) return [];
    return data.map((coin: MarketCoin) => {
      const realtime = realtimePrices[coin.symbol];
      if (realtime) {
        return {
          ...coin,
          lastPrice: realtime.price,
          priceChangePercent: realtime.priceChangePercent,
          quoteVolume: realtime.volume * realtime.price
        };
      }
      return coin;
    });
  }, [data, realtimePrices, isLoading]);

  return (
    <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
      <section className="rounded-3xl border border-white/5 bg-slate-900/40 p-5 shadow-2xl shadow-black/40">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/70">Market Pulse</p>
            <h2 className="text-2xl font-semibold text-white mt-2">{currentTab.label}</h2>
            <p className="text-sm text-slate-400">{currentTab.description}</p>
          </div>
          <Tab.List className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                className={({ selected }) =>
                  `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    selected
                      ? 'bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/30'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`
                }
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Tab>
            ))}
          </Tab.List>
        </div>

        <Tab.Panels>
          <Tab.Panel>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {(isLoading 
                ? (Array.from({ length: 8 }) as undefined[]) 
                : coinsWithRealtime
              ).map((coin: MarketCoin | undefined, index: number) => (
                <button
                  key={coin?.symbol ?? index}
                  onClick={() => {
                    if (!coin) return;
                    navigate(`/coin/${coin.symbol}`);
                  }}
                  className="group flex flex-col rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition hover:-translate-y-1 hover:border-emerald-300/40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {coin ? (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-400">{humanizeSymbol(coin.symbol)}</p>
                        <span
                          className={`text-xs font-semibold uppercase tracking-wider ${
                            coin.priceChangePercent >= 0 ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          {formatPercent(coin.priceChangePercent)}
                        </span>
                      </div>
                      <p className="mt-3 text-2xl font-semibold text-white">${coin.lastPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                        <span>Volume</span>
                        <span className="font-semibold text-slate-100">{formatCurrency(coin.quoteVolume)}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {coin.quoteAsset ?? '–'} • {coin.count.toLocaleString()} trades
                      </div>
                      <p className="mt-3 text-xs text-emerald-300 opacity-0 transition group-hover:opacity-100">
                        + Add to watchlist
                      </p>
                    </>
                  ) : (
                    <div className="h-24 w-full animate-pulse rounded-xl bg-white/5" />
                  )}
                </button>
              ))}
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </section>
    </Tab.Group>
  );
};

export default MarketHighlights;

