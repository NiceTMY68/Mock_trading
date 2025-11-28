import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageLayout from '../components/layout/PageLayout';
import Link from '../components/common/Link';
import CoinHeader from '../components/coinDetail/CoinHeader';
import PriceChart from '../components/coinDetail/PriceChart';
import StatisticsPanel from '../components/coinDetail/StatisticsPanel';
import OrderBookPanel from '../components/coinDetail/OrderBookPanel';
import RecentTradesPanel from '../components/coinDetail/RecentTradesPanel';
import { getTicker } from '../api/coinDetail';
import { useWatchlistStore } from '../store/watchlist';

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

  const { data: ticker } = useQuery({
    queryKey: ['ticker', symbol],
    queryFn: () => getTicker(symbol!),
    enabled: !!symbol,
    refetchInterval: 30_000
  });

  const setSelectedSymbol = useWatchlistStore((state) => state.setSelectedSymbol);

  useEffect(() => {
    if (symbol) {
      setSelectedSymbol(symbol);
    }
  }, [symbol, setSelectedSymbol]);

  if (!symbol) {
    return (
      <PageLayout>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">
            <p className="text-rose-400 mb-4">Invalid coin symbol</p>
            <Link href="/" className="text-emerald-400 hover:text-emerald-300 underline">
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-emerald-400 transition inline-flex items-center gap-2"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="space-y-6">
          {/* Header */}
          <CoinHeader symbol={symbol} />

          {/* Chart */}
          <PriceChart symbol={symbol} />

          {/* Statistics */}
          <StatisticsPanel symbol={symbol} />

          {/* Order Book & Recent Trades */}
          <div className="grid gap-6 lg:grid-cols-2">
            <OrderBookPanel symbol={symbol} />
            <RecentTradesPanel symbol={symbol} />
          </div>
        </div>
      </main>
    </PageLayout>
  );
};

export default CoinDetailPage;

