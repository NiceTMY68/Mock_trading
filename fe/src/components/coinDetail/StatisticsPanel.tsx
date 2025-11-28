import { useQuery } from '@tanstack/react-query';
import { getTicker } from '../../api/coinDetail';
import { formatCurrency, formatPercent } from '../../utils/format';
import { useRealtimePrices } from '../../hooks/useRealtimePrices';

interface StatisticsPanelProps {
  symbol: string;
}

const StatisticsPanel = ({ symbol }: StatisticsPanelProps) => {
  const { data: ticker, isLoading } = useQuery({
    queryKey: ['ticker', symbol],
    queryFn: () => getTicker(symbol),
    refetchInterval: 30_000
  });

  const { prices } = useRealtimePrices([symbol]);
  const realtimePrice = prices[symbol];

  const currentPrice = realtimePrice?.price || ticker?.lastPrice || 0;
  const high24h = ticker?.highPrice || 0;
  const low24h = ticker?.lowPrice || 0;
  const volume24h = ticker?.volume || 0;
  const quoteVolume24h = ticker?.quoteVolume || 0;
  const trades24h = ticker?.count || 0;
  const openPrice = ticker?.openPrice || 0;

  const stats = [
    {
      label: '24h High',
      value: formatCurrency(high24h),
      change: currentPrice > 0 ? ((high24h - currentPrice) / currentPrice) * 100 : 0
    },
    {
      label: '24h Low',
      value: formatCurrency(low24h),
      change: currentPrice > 0 ? ((currentPrice - low24h) / currentPrice) * 100 : 0
    },
    {
      label: '24h Volume',
      value: formatCurrency(quoteVolume24h),
      subValue: `${volume24h.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${ticker?.baseAsset || ''}`
    },
    {
      label: '24h Trades',
      value: trades24h.toLocaleString()
    },
    {
      label: 'Open Price',
      value: formatCurrency(openPrice),
      change: currentPrice > 0 && openPrice > 0 ? ((currentPrice - openPrice) / openPrice) * 100 : 0
    },
    {
      label: 'Price Change',
      value: formatCurrency(ticker?.priceChange || 0),
      change: ticker?.priceChangePercent || 0
    }
  ];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 bg-white/10 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">24h Statistics</h2>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="rounded-xl border border-white/5 bg-white/5 p-4">
            <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
            <p className="text-lg font-semibold text-white mb-1">{stat.value}</p>
            {stat.subValue && (
              <p className="text-xs text-slate-500">{stat.subValue}</p>
            )}
            {stat.change !== undefined && stat.change !== 0 && (
              <p
                className={`text-xs font-medium ${
                  stat.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {stat.change >= 0 ? '+' : ''}
                {formatPercent(stat.change)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatisticsPanel;

