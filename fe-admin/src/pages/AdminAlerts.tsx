import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { getAllAlerts } from '../api/admin';
import { formatDistanceToNow } from 'date-fns';

const AdminAlertsPage = () => {
  const { user } = useAuthStore();
  const [page, setPage] = useState(0);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-alerts', page, userIdFilter, symbolFilter, isActiveFilter, search],
    queryFn: () =>
      getAllAlerts({
        page,
        size: 20,
        userId: userIdFilter ? parseInt(userIdFilter) : undefined,
        symbol: symbolFilter || undefined,
        isActive: isActiveFilter === 'true' ? true : isActiveFilter === 'false' ? false : undefined,
        search: search || undefined
      }),
    enabled: user?.role === 'admin'
  });

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen text-white flex items-center justify-center" style={{ background: 'radial-gradient(circle at top, rgba(52, 211, 153, 0.2), transparent), radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.25), transparent 45%), #020617' }}>
        <div className="text-center">
          <p className="text-rose-400 text-xl mb-4">Access Denied</p>
          <a href="/" className="text-emerald-400 hover:text-emerald-300 underline">← Back to Dashboard</a>
        </div>
      </div>
    );
  }

  const alerts = data?.alerts || [];
  const pagination = data?.pagination;

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'above': return 'Price above';
      case 'below': return 'Price below';
      case 'percent_change_up': return 'Increase by';
      case 'percent_change_down': return 'Decrease by';
      default: return condition;
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">All Alerts</h1>
            <p className="text-slate-400">View and manage all user alerts</p>
          </div>
          <a
            href="/admin"
            className="text-sm text-slate-400 hover:text-emerald-400 transition"
          >
            ← Back to Admin Dashboard
          </a>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by symbol or notes..."
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
          />
          <input
            type="number"
            value={userIdFilter}
            onChange={(e) => {
              setUserIdFilter(e.target.value);
              setPage(0);
            }}
            placeholder="User ID"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
          />
          <input
            type="text"
            value={symbolFilter}
            onChange={(e) => {
              setSymbolFilter(e.target.value.toUpperCase());
              setPage(0);
            }}
            placeholder="Symbol (e.g. BTCUSDT)"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
          />
          <select
            value={isActiveFilter}
            onChange={(e) => {
              setIsActiveFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 h-32 animate-pulse" />
            ))
          ) : alerts.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-8 text-center text-slate-400">
              No alerts found
            </div>
          ) : (
            alerts.map((alert: any) => (
              <div key={alert.id} className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{alert.symbol}</h3>
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${
                          alert.isActive
                            ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                            : 'bg-slate-400/20 text-slate-300 border border-slate-400/30'
                        }`}
                      >
                        {alert.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">
                      {getConditionLabel(alert.condition)} ${alert.targetValue.toFixed(8)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>User: {alert.userName || alert.userEmail} (ID: {alert.userId})</span>
                      {alert.notes && (
                        <>
                          <span>•</span>
                          <span>Notes: {alert.notes}</span>
                        </>
                      )}
                      {alert.triggeredAt && (
                        <>
                          <span>•</span>
                          <span>Triggered: {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Created: {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-emerald-300 transition disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-400">
              Page {page + 1} of {pagination.pages} ({pagination.total} total)
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= pagination.pages}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-emerald-300 transition disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
    </div>
  );
};

export default AdminAlertsPage;

