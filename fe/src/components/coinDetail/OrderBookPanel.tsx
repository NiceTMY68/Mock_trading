import { useQuery } from '@tanstack/react-query';
import { getOrderBook, OrderBookEntry } from '../../api/coinDetail';
import { formatCurrency } from '../../utils/format';

interface OrderBookPanelProps {
  symbol: string;
}

const OrderBookPanel = ({ symbol }: OrderBookPanelProps) => {
  const { data: orderBook, isLoading } = useQuery({
    queryKey: ['orderbook', symbol],
    queryFn: () => getOrderBook(symbol, 20),
    refetchInterval: 15_000 // Refresh every 15 seconds (reduced from 5s to avoid rate limiting)
  });

  const renderOrderBookSide = (entries: OrderBookEntry[], isBids: boolean) => {
    return (
      <div className="flex-1">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {isBids ? 'Bids' : 'Asks'}
        </div>
        <div className="space-y-1">
          {entries.slice(0, 10).map((entry, index) => (
            <div
              key={index}
              className={`flex items-center justify-between text-sm rounded px-2 py-1 ${
                isBids
                  ? 'bg-emerald-400/10 hover:bg-emerald-400/20'
                  : 'bg-rose-400/10 hover:bg-rose-400/20'
              }`}
            >
              <span className={isBids ? 'text-emerald-300' : 'text-rose-300'}>
                {formatCurrency(entry.price)}
              </span>
              <span className="text-slate-300">{entry.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

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

  if (!orderBook) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
        <p className="text-slate-400">No order book data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Order Book</h2>
      <div className="flex gap-4">
        {renderOrderBookSide(orderBook.bids, true)}
        {renderOrderBookSide(orderBook.asks, false)}
      </div>
      {orderBook.bids.length > 0 && orderBook.asks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5 text-center">
          <p className="text-xs text-slate-400">Spread</p>
          <p className="text-sm font-semibold text-white">
            {formatCurrency(orderBook.asks[0].price - orderBook.bids[0].price)} (
            {orderBook.bids[0].price > 0
              ? (((orderBook.asks[0].price - orderBook.bids[0].price) / orderBook.bids[0].price) * 100).toFixed(4)
              : '0.0000'}
            %)
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderBookPanel;

