import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getKlines } from '../../api/coinDetail';
import CandlestickChart from '../CandlestickChart';
import { CandlestickData } from '../../types';

interface PriceChartProps {
  symbol: string;
}

const intervals = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' }
];

const PriceChart = ({ symbol }: PriceChartProps) => {
  const [interval, setInterval] = useState('1h');

  const { data: klines, isLoading } = useQuery({
    queryKey: ['klines', symbol, interval],
    queryFn: () => getKlines({ symbol, interval, limit: 100 }),
    refetchInterval: 60_000 // Refresh every minute
  });

  // Convert klines to CandlestickData format
  const chartData: CandlestickData[] =
    klines?.map((k) => ({
      time: k.openTime,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume
    })) || [];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-white/10 rounded"></div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Price Chart</h2>
        <div className="flex gap-2">
          {intervals.map((int) => (
            <button
              key={int.value}
              onClick={() => setInterval(int.value)}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                interval === int.value
                  ? 'bg-emerald-400 text-slate-900'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {int.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-96">
        {chartData.length > 0 ? (
          <CandlestickChart data={chartData} symbol={symbol} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            No chart data available
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceChart;

