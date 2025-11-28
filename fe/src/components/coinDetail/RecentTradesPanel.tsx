import { useQuery } from '@tanstack/react-query';
import { getRecentTrades, Trade } from '../../api/coinDetail';
import { formatCurrency } from '../../utils/format';
import { formatDistanceToNow } from 'date-fns';

interface RecentTradesPanelProps {
  symbol: string;
}

const RecentTradesPanel = ({ symbol }: RecentTradesPanelProps) => {
  const { data: trades, isLoading } = useQuery({
    queryKey: ['trades', symbol],
    queryFn: () => getRecentTrades(symbol, 30),
    refetchInterval: 10_000 // Refresh every 10 seconds (reduced from 3s to avoid rate limiting)
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-white/10 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!trades || trades.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
        <p className="text-slate-400">No recent trades available</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Recent Trades</h2>
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {trades.slice(0, 30).map((trade) => (
          <div
            key={trade.id}
            className="flex items-center justify-between text-sm rounded px-3 py-2 hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-3 flex-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  trade.isBuyerMaker ? 'bg-rose-400' : 'bg-emerald-400'
                }`}
              />
              <span className={`font-medium ${trade.isBuyerMaker ? 'text-rose-300' : 'text-emerald-300'}`}>
                {formatCurrency(trade.price)}
              </span>
              <span className="text-slate-400">{trade.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
            </div>
            <span className="text-xs text-slate-500">
              {formatDistanceToNow(new Date(trade.time), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentTradesPanel;

