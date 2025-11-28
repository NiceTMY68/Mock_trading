import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { getPortfolioSnapshots, PortfolioSnapshot } from '../../api/portfolio';
import { formatCurrency } from '../../utils/format';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PortfolioHistoricChart = () => {
  const { isAuthenticated } = useAuthStore();

  const { data: snapshots, isLoading } = useQuery<PortfolioSnapshot[]>({
    queryKey: ['portfolio-snapshots'],
    queryFn: () => getPortfolioSnapshots(30),
    enabled: isAuthenticated,
    refetchInterval: 60_000
  });

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 shadow-2xl shadow-black/50">
        <div className="h-64 animate-pulse rounded-lg bg-white/5" />
      </section>
    );
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 shadow-2xl shadow-black/50">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Portfolio History</p>
          <h3 className="text-xl font-semibold text-white">30-Day Value</h3>
        </div>
        <p className="text-sm text-slate-500 text-center py-8">
          No historical data yet. Snapshots will be created automatically.
        </p>
      </section>
    );
  }

  const chartData = {
    labels: snapshots.map((s) => {
      const date = new Date(s.createdAt);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Portfolio Value',
        data: snapshots.map((s) => s.totalValue),
        borderColor: 'rgb(52, 211, 153)',
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            return `Value: ${formatCurrency(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          maxTicksLimit: 7
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          callback: (value: any) => {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  const latestSnapshot = snapshots[snapshots.length - 1];
  const firstSnapshot = snapshots[0];
  const totalChange = latestSnapshot.totalValue - firstSnapshot.totalValue;
  const totalChangePercent = firstSnapshot.totalValue > 0 
    ? (totalChange / firstSnapshot.totalValue) * 100 
    : 0;

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 shadow-2xl shadow-black/50">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Portfolio History</p>
        <h3 className="text-xl font-semibold text-white">30-Day Value</h3>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{formatCurrency(latestSnapshot.totalValue)}</p>
          <p className={`text-sm font-semibold ${totalChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalChange >= 0 ? '+' : ''}
            {formatCurrency(totalChange)} ({totalChangePercent >= 0 ? '+' : ''}
            {totalChangePercent.toFixed(2)}%)
          </p>
        </div>
      </div>

      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </section>
  );
};

export default PortfolioHistoricChart;

