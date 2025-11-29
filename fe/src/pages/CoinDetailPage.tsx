import { useEffect, useState } from 'react';
// TEMPORARILY DISABLED - Market data
// import { useQuery } from '@tanstack/react-query';
import PageLayout from '../components/layout/PageLayout';
import Link from '../components/common/Link';
// TEMPORARILY DISABLED - Coin detail components
// import CoinHeader from '../components/coinDetail/CoinHeader';
// import PriceChart from '../components/coinDetail/PriceChart';
// import StatisticsPanel from '../components/coinDetail/StatisticsPanel';
// import OrderBookPanel from '../components/coinDetail/OrderBookPanel';
// import RecentTradesPanel from '../components/coinDetail/RecentTradesPanel';
// import { getTicker } from '../api/coinDetail';
// import { useWatchlistStore } from '../store/watchlist';

const CoinDetailPage = () => {
  // Get symbol from URL
  const [symbol, setSymbol] = useState<string | null>(null);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const coinSymbol = pathParts[pathParts.length - 1];
    if (coinSymbol && coinSymbol.length > 0) {
      setSymbol(coinSymbol.toUpperCase());
    }
  }, []);

  // TEMPORARILY DISABLED - Ticker query
  // const { data: ticker } = useQuery({
  //   queryKey: ['ticker', symbol],
  //   queryFn: () => getTicker(symbol!),
  //   enabled: !!symbol,
  //   refetchInterval: 30_000
  // });

  // TEMPORARILY DISABLED - Watchlist store
  // const setSelectedSymbol = useWatchlistStore((state) => state.setSelectedSymbol);
  // useEffect(() => {
  //   if (symbol) {
  //     setSelectedSymbol(symbol);
  //   }
  // }, [symbol, setSelectedSymbol]);

  return (
    <PageLayout>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-emerald-400 transition inline-flex items-center gap-2"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* TEMPORARILY DISABLED - Coin detail components */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            📊 {symbol || 'Coin'} Details
          </h2>
          <p className="text-slate-400 mb-4">
            Coin detail page temporarily disabled for development.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition"
          >
            ← Return to Dashboard
          </Link>
        </div>

        {/* ORIGINAL CODE - Uncomment when ready
        <div className="space-y-6">
          <CoinHeader symbol={symbol} />
          <PriceChart symbol={symbol} />
          <StatisticsPanel symbol={symbol} />
          <div className="grid gap-6 lg:grid-cols-2">
            <OrderBookPanel symbol={symbol} />
            <RecentTradesPanel symbol={symbol} />
          </div>
        </div>
        */}
      </main>
    </PageLayout>
  );
};

export default CoinDetailPage;
