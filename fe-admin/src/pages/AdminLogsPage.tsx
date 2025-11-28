import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { getSystemLogs, getLogStats, SystemLog } from '../api/admin';
import { formatDistanceToNow } from 'date-fns';

const AdminLogsPage = () => {
    const [levelFilter, setLevelFilter] = useState<string>('');

  const { data: logs, isLoading } = useQuery<SystemLog[]>({
    queryKey: ['admin-logs', levelFilter],
    queryFn: () => getSystemLogs({ level: levelFilter || undefined, limit: 100 }),
    enabled: user?.role === 'admin',
    refetchInterval: 30_000
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-log-stats'],
    queryFn: () => getLogStats(7),
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

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-rose-400 bg-rose-400/10 border-rose-400/30';
      case 'warn':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      case 'info':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">System Logs</h1>
            <p className="text-slate-400">View system logs and errors</p>
          </div>
          <a
            href="/admin"
            className="text-sm text-slate-400 hover:text-emerald-400 transition"
          >
            ← Back to Admin Dashboard
          </a>
        </div>

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.level} className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-400 mb-1">{stat.level.toUpperCase()}</p>
                <p className="text-2xl font-bold text-white">{stat.count}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter */}
        <div className="mb-6">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
          >
            <option value="">All Levels</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        {/* Logs List */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded bg-white/5" />
                ))}
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No logs found</div>
            ) : (
              <div className="divide-y divide-white/5">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-white/5 transition">
                    <div className="flex items-start gap-3">
                      <span
                        className={`px-2 py-1 text-xs rounded border ${getLevelColor(log.level)}`}
                      >
                        {log.level}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white mb-1">{log.message}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                          {log.userId && <span>• User {log.userId}</span>}
                          {log.ipAddress && <span>• {log.ipAddress}</span>}
                        </div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-slate-400 cursor-pointer">Metadata</summary>
                            <pre className="mt-2 text-xs text-slate-500 bg-white/5 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>    </div>
  );
};

export default AdminLogsPage;

