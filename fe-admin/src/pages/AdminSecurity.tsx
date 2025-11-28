import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { getFailedLogins, getSecurityStats } from '../api/admin';
import { format, formatDistanceToNow } from 'date-fns';

const AdminSecurityPage = () => {
  const { user } = useAuthStore();
  const [page, setPage] = useState(0);
  const [emailFilter, setEmailFilter] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['admin-failed-logins', page, emailFilter, ipFilter, startDate, endDate],
    queryFn: () =>
      getFailedLogins({
        page,
        size: 50,
        email: emailFilter || undefined,
        ipAddress: ipFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      }),
    enabled: user?.role === 'admin'
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-security-stats'],
    queryFn: () => getSecurityStats(7),
    enabled: user?.role === 'admin',
    refetchInterval: 60_000
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

  const failedAttempts = attempts?.attempts || [];
  const pagination = attempts?.pagination;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Security Audit</h1>
            <p className="text-slate-400">Monitor failed login attempts and security incidents</p>
          </div>
          <a
            href="/admin"
            className="text-sm text-slate-400 hover:text-emerald-400 transition"
          >
            ← Back to Admin Dashboard
          </a>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
              <p className="text-sm text-slate-400 mb-2">Total Attempts (7d)</p>
              <p className="text-3xl font-bold text-white">{stats.stats.totalAttempts}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
              <p className="text-sm text-slate-400 mb-2">Unique Emails</p>
              <p className="text-3xl font-bold text-amber-400">{stats.stats.uniqueEmails}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
              <p className="text-sm text-slate-400 mb-2">Unique IPs</p>
              <p className="text-3xl font-bold text-blue-400">{stats.stats.uniqueIPs}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
              <p className="text-sm text-slate-400 mb-2">Last Attempt</p>
              <p className="text-sm font-semibold text-white">
                {stats.stats.lastAttempt ? formatDistanceToNow(new Date(stats.stats.lastAttempt), { addSuffix: true }) : 'Never'}
              </p>
            </div>
          </div>
        )}

        {/* Top Failed Emails & IPs */}
        {stats && (stats.topFailedEmails.length > 0 || stats.topFailedIPs.length > 0) && (
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            {stats.topFailedEmails.length > 0 && (
              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Top Failed Emails</h3>
                <div className="space-y-2">
                  {stats.topFailedEmails.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-sm text-slate-300">{item.email}</span>
                      <span className="text-sm font-semibold text-rose-400">{item.attempt_count} attempts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {stats.topFailedIPs.length > 0 && (
              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Top Failed IPs</h3>
                <div className="space-y-2">
                  {stats.topFailedIPs.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-sm text-slate-300">{item.ip_address}</span>
                      <span className="text-sm font-semibold text-rose-400">{item.attempt_count} attempts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            value={emailFilter}
            onChange={(e) => {
              setEmailFilter(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by email..."
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
          />
          <input
            type="text"
            value={ipFilter}
            onChange={(e) => {
              setIpFilter(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by IP address..."
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>

        {/* Failed Login Attempts */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">IP Address</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Attempted At</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : failedAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No failed login attempts found
                    </td>
                  </tr>
                ) : (
                  failedAttempts.map((attempt: any) => (
                    <tr key={attempt.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-sm text-white">{attempt.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{attempt.ip_address || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{attempt.reason || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {format(new Date(attempt.attempted_at), 'MMM d, yyyy HH:mm:ss')}
                        <br />
                        <span className="text-xs">{formatDistanceToNow(new Date(attempt.attempted_at), { addSuffix: true })}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

export default AdminSecurityPage;

