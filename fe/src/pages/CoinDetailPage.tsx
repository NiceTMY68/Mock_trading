import { useEffect, useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import Link from '../components/common/Link';

const CoinDetailPage = () => {
  const [symbol, setSymbol] = useState<string | null>(null);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const coinSymbol = pathParts[pathParts.length - 1];
    if (coinSymbol && coinSymbol.length > 0) {
      setSymbol(coinSymbol.toUpperCase());
    }
  }, []);

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
      </main>
    </PageLayout>
  );
};

export default CoinDetailPage;
