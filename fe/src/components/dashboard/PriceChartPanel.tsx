import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Line } from 'react-chartjs-2';
import { fetchKlines, fetchTicker } from '../../api/market';
import { useWatchlistStore } from '../../store/watchlist';
import { formatCurrency, formatPercent, humanizeSymbol } from '../../utils/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, TimeScale);

const ranges = {
  '1H': { interval: '1m', limit: 60 },
  '1D': { interval: '15m', limit: 96 },
  '1W': { interval: '4h', limit: 42 }
};

type RangeKey = keyof typeof ranges;

const PriceChartPanel = () => {
  const [range, setRange] = useState<RangeKey>('1D');
  const selectedSymbol = useWatchlistStore((state) => state.selectedSymbol);

  const { interval, limit } = ranges[range];

  const { data: klines, isLoading } = useQuery({
    queryKey: ['price-chart', selectedSymbol, range],
    queryFn: () =>
      fetchKlines({
        symbol: selectedSymbol,
        interval,
        limit
      }),
    enabled: !!selectedSymbol,
    refetchInterval: 60_000
  });

  const { data: ticker } = useQuery({
    queryKey: ['ticker', selectedSymbol],
    queryFn: () => fetchTicker(selectedSymbol),
    enabled: !!selectedSymbol,
    refetchInterval: 30_000, // Reduced from 15s to 30s to avoid rate limiting
    staleTime: 20_000 // Consider data fresh for 20 seconds
  });

  const chartData = useMemo(() => {
    if (!klines) return null;
    return {
      labels: klines.map((point) => point.openTime),
      datasets: [
        {
          label: humanizeSymbol(selectedSymbol),
          data: klines.map((point) => point.close),
          borderColor: '#34d399',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(52, 211, 153, 0.35)');
            gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
            return gradient;
          }
        }
      ]
    };
  }, [klines, selectedSymbol]);

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Focus Asset</p>
          <h3 className="text-2xl font-semibold text-white">{humanizeSymbol(selectedSymbol)}</h3>
          {ticker ? (
            <div className="flex items-baseline gap-2 text-white">
              <p className="text-3xl font-bold">{formatCurrency(ticker.price, { maximumFractionDigits: 6 })}</p>
              <span className={(ticker.priceChangePercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {formatPercent(ticker.priceChangePercent ?? 0)}
              </span>
            </div>
          ) : (
            <div className="mt-2 h-8 w-32 animate-pulse rounded-lg bg-white/10" />
          )}
        </div>
        <div className="flex gap-2">
          {Object.keys(ranges).map((key) => (
            <button
              key={key}
              onClick={() => setRange(key as RangeKey)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                range === key ? 'bg-emerald-400 text-slate-900' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        {chartData && !isLoading ? (
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' } },
              scales: {
                x: {
                  type: 'time',
                  ticks: {
                    color: '#94a3b8'
                  },
                  grid: { color: 'rgba(148,163,184,0.1)' }
                },
                y: {
                  ticks: {
                    color: '#94a3b8',
                    callback: (value) => `$${Number(value).toLocaleString()}`
                  },
                  grid: { color: 'rgba(148,163,184,0.1)' }
                }
              }
            }}
          />
        ) : (
          <div className="h-full w-full animate-pulse rounded-2xl bg-white/5" />
        )}
      </div>
    </section>
  );
};

export default PriceChartPanel;

