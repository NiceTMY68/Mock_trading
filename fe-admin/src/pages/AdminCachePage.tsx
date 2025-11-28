import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { getCacheStats, invalidateCache } from '../api/admin';

const AdminCachePage = () => {
    const queryClient = useQueryClient();
  const [pattern, setPattern] = useState('');
  const [invalidatePattern, setInvalidatePattern] = useState('');

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['admin-cache-stats'],
    queryFn: getCacheStats,
    refetchInterval: 30_000
  });

  const invalidateMutation = useMutation({
    mutationFn: (pattern?: string) => invalidateCache(pattern),
    onSuccess: (data) => {
      alert(`Cache invalidated: ${data.deletedCount} keys deleted`);
      refetch();
    }
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Cache Management</h1>
            <p className="text-slate-400">Manage Redis cache and invalidate keys</p>
          </div>
          <a
            href="/admin"
            className="text-sm text-slate-400 hover:text-emerald-400 transition"
          >
            ← Back to Admin Dashboard
          </a>
        </div>

        {/* Cache Stats */}
        <div className="mb-6 rounded-2xl border border-white/5 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Cache Statistics</h2>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-white/10 rounded w-1/3"></div>
              <div className="h-4 bg-white/10 rounded w-1/2"></div>
            </div>
          ) : stats ? (
            stats.available ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Keys</p>
                  <p className="text-2xl font-bold text-white">{stats.totalKeys || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Binance Keys</p>
                  <p className="text-2xl font-bold text-emerald-400">{stats.binanceKeys || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">News Keys</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.newsKeys || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Other Keys</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.otherKeys || 0}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                <p className="text-amber-300">⚠️ Redis not available</p>
                <p className="text-sm text-amber-400/80 mt-1">{stats.message}</p>
              </div>
            )
          ) : null}
        </div>

        {/* Invalidate Cache */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Invalidate Cache</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Pattern (leave empty to clear all Binance cache)
              </label>
              <input
                type="text"
                value={invalidatePattern}
                onChange={(e) => setInvalidatePattern(e.target.value)}
                placeholder="e.g., binance:price:* or news:*"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Use wildcards: * matches any characters, ? matches single character
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => invalidateMutation.mutate(invalidatePattern || undefined)}
                disabled={invalidateMutation.isPending}
                className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition disabled:opacity-50"
              >
                {invalidateMutation.isPending ? 'Invalidating...' : 'Invalidate Cache'}
              </button>
              <button
                onClick={() => invalidateMutation.mutate('binance:*')}
                disabled={invalidateMutation.isPending}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:border-emerald-400 transition disabled:opacity-50"
              >
                Clear All Binance
              </button>
              <button
                onClick={() => invalidateMutation.mutate('news:*')}
                disabled={invalidateMutation.isPending}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:border-emerald-400 transition disabled:opacity-50"
              >
                Clear All News
              </button>
            </div>
          </div>
        </div>    </div>
  );
};

export default AdminCachePage;

