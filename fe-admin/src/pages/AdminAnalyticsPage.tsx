import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { getDashboardStats, getLogStats } from '../api/admin';
import { formatNumber } from '../utils/format';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const AdminAnalyticsPage = () => {
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: getDashboardStats,
    enabled: user?.role === 'admin'
  });

  const { data: logStats } = useQuery({
    queryKey: ['admin-log-stats'],
    queryFn: () => getLogStats(30),
    enabled: user?.role === 'admin'
  });

  if (user?.role !== 'admin') {
    return (
    <div>
      <div className="min-h-screen text-white flex items-center justify-center" style={{ background: 'radial-gradient(circle at top, rgba(52, 211, 153, 0.2), transparent), radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.25), transparent 45%), #020617' }}>
        <div className="text-center">
          <p className="text-rose-400 text-xl mb-4">Access Denied</p>
          <a href="/" className="text-emerald-400 hover:text-emerald-300 underline">← Back to Dashboard</a>
        </div>
      </div>
    );
  }

  const logChartData = logStats
    ? {
        labels: logStats.map((s) => s.level.toUpperCase()),
        datasets: [
          {
            label: 'Log Count (30 days)',
            data: logStats.map((s) => s.count),
            backgroundColor: [
              'rgba(239, 68, 68, 0.5)',
              'rgba(251, 191, 36, 0.5)',
              'rgba(59, 130, 246, 0.5)',
              'rgba(148, 163, 184, 0.5)'
            ],
            borderColor: [
              'rgb(239, 68, 68)',
              'rgb(251, 191, 36)',
              'rgb(59, 130, 246)',
              'rgb(148, 163, 184)'
            ],
            borderWidth: 1
          }
        ]
      }
    : null;

  const logChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)'
        }
      }
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
            <p className="text-slate-400">View detailed analytics and metrics</p>
          </div>
          <a
            href="/admin"
            className="text-sm text-slate-400 hover:text-emerald-400 transition"
          >
            ← Back to Admin Dashboard
          </a>
        </div>

        {statsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 h-32 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* User Analytics */}
            <div className="mb-6 rounded-2xl border border-white/5 bg-slate-900/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">User Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Users</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(stats.users.total)}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.users.active} active ({((stats.users.active / stats.users.total) * 100).toFixed(1)}%)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">New Registrations (7d)</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(stats.users.recentRegistrations)}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Avg: {((stats.users.recentRegistrations / 7) * 1).toFixed(1)}/day
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Inactive Users</p>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(stats.users.total - stats.users.active)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(((stats.users.total - stats.users.active) / stats.users.total) * 100).toFixed(1)}% of total
                  </p>
                </div>
              </div>
            </div>

            {/* Content Analytics */}
            <div className="mb-6 rounded-2xl border border-white/5 bg-slate-900/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Content Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Posts</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(stats.posts.total)}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.posts.pending} pending • {stats.posts.recent} new (7d)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Comments</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(stats.comments.total)}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Avg: {stats.posts.total > 0 ? (stats.comments.total / stats.posts.total).toFixed(1) : 0} per post
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Published Posts</p>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(stats.posts.total - stats.posts.pending)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.posts.total > 0
                      ? (((stats.posts.total - stats.posts.pending) / stats.posts.total) * 100).toFixed(1)
                      : 0}% approval rate
                  </p>
                </div>
              </div>
            </div>

            {/* Moderation Analytics */}
            <div className="mb-6 rounded-2xl border border-white/5 bg-slate-900/60 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Moderation Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Reports</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(stats.reports.total)}</p>
                  <p className="text-xs text-rose-400 mt-1">{stats.reports.pending} pending review</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Resolved Reports</p>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(stats.reports.total - stats.reports.pending)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.reports.total > 0
                      ? (((stats.reports.total - stats.reports.pending) / stats.reports.total) * 100).toFixed(1)
                      : 0}% resolved
                  </p>
                </div>
              </div>
            </div>

            {/* System Logs Chart */}
            {logChartData && (
              <div className="mb-6 rounded-2xl border border-white/5 bg-slate-900/60 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">System Logs (30 days)</h2>
                <div className="h-64">
                  <Bar data={logChartData} options={logChartOptions} />
                </div>
              </div>
            )}
          </>
        ) : null}    </div>
  );
};

export default AdminAnalyticsPage;

