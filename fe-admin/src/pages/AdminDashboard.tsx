import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, DashboardStats } from '../api/admin';
import { formatNumber } from '../utils/format';
import {
  UsersIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  PresentationChartLineIcon,
  ServerIcon,
  MegaphoneIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

const AdminDashboardPage = () => {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 60_000
  });

  return (
    <div>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-400/30">
              <LockClosedIcon className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                Admin Control Center
              </h1>
              <p className="text-slate-400 text-sm mt-1">System management & analytics terminal</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 h-32 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="group relative rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-6 backdrop-blur-xl hover:border-cyan-400/40 transition-all shadow-lg shadow-cyan-500/10">
              <div className="flex items-center justify-between mb-3">
                <UsersIcon className="w-6 h-6 text-cyan-400" />
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <p className="text-sm text-slate-400 mb-2 font-medium">Total Users</p>
              <p className="text-3xl font-bold text-white mb-2">{formatNumber(stats.users.total)}</p>
              <p className="text-xs text-slate-500">
                {stats.users.active} active • {stats.users.recentRegistrations} new (7d)
              </p>
            </div>
            
            <div className="group relative rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6 backdrop-blur-xl hover:border-purple-400/40 transition-all shadow-lg shadow-purple-500/10">
              <div className="flex items-center justify-between mb-3">
                <DocumentTextIcon className="w-6 h-6 text-purple-400" />
                <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              </div>
              <p className="text-sm text-slate-400 mb-2 font-medium">Total Posts</p>
              <p className="text-3xl font-bold text-white mb-2">{formatNumber(stats.posts.total)}</p>
              <p className="text-xs text-slate-500">
                {stats.posts.pending} pending • {stats.posts.recent} new (7d)
              </p>
            </div>
            
            <div className="group relative rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-6 backdrop-blur-xl hover:border-emerald-400/40 transition-all shadow-lg shadow-emerald-500/10">
              <div className="flex items-center justify-between mb-3">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-emerald-400" />
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-sm text-slate-400 mb-2 font-medium">Total Comments</p>
              <p className="text-3xl font-bold text-white mb-2">{formatNumber(stats.comments.total)}</p>
            </div>
            
            <div className="group relative rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-500/10 to-rose-500/5 p-6 backdrop-blur-xl hover:border-rose-400/40 transition-all shadow-lg shadow-rose-500/10">
              <div className="flex items-center justify-between mb-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-rose-400" />
                <div className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
              </div>
              <p className="text-sm text-slate-400 mb-2 font-medium">Reports</p>
              <p className="text-3xl font-bold text-white mb-2">{formatNumber(stats.reports.total)}</p>
              <p className="text-xs text-rose-400 font-medium">{stats.reports.pending} pending review</p>
            </div>
          </div>
        ) : null}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <a
            href="/admin/users"
            className="group relative rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-6 backdrop-blur-xl hover:border-cyan-400/40 transition-all shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/30">
                <UsersIcon className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-cyan-300 transition-colors">User Management</h3>
            <p className="text-sm text-slate-400">View, ban, and manage users</p>
          </a>
          
          <a
            href="/admin/posts"
            className="group relative rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6 backdrop-blur-xl hover:border-purple-400/40 transition-all shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/30">
                <DocumentTextIcon className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-300 transition-colors">Content Moderation</h3>
            <p className="text-sm text-slate-400">Approve, reject, and delete posts</p>
          </a>
          
          <a
            href="/admin/reports"
            className="group relative rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-500/10 to-rose-500/5 p-6 backdrop-blur-xl hover:border-rose-400/40 transition-all shadow-lg shadow-rose-500/10 hover:shadow-rose-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-400/30">
                <ExclamationTriangleIcon className="w-6 h-6 text-rose-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-rose-300 transition-colors">Reports</h3>
            <p className="text-sm text-slate-400">Review and resolve reports</p>
          </a>
        </div>

        {/* Additional Links */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <a
            href="/admin/logs"
            className="group relative rounded-2xl border border-slate-400/20 bg-gradient-to-br from-slate-500/10 to-slate-500/5 p-6 backdrop-blur-xl hover:border-slate-400/40 transition-all shadow-lg shadow-slate-500/10 hover:shadow-slate-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-slate-500/20 border border-slate-400/30">
                <ChartBarIcon className="w-6 h-6 text-slate-300 group-hover:scale-110 transition-transform" />
              </div>
              <div className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-slate-200 transition-colors">System Logs</h3>
            <p className="text-sm text-slate-400">View system logs and errors</p>
          </a>
          
          <a
            href="/admin/analytics"
            className="group relative rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-6 backdrop-blur-xl hover:border-emerald-400/40 transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                <PresentationChartLineIcon className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-emerald-300 transition-colors">Analytics</h3>
            <p className="text-sm text-slate-400">View detailed analytics and metrics</p>
          </a>

          <a
            href="/admin/cache"
            className="group relative rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-6 backdrop-blur-xl hover:border-cyan-400/40 transition-all shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/30">
                <ServerIcon className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-cyan-300 transition-colors">Cache Management</h3>
            <p className="text-sm text-slate-400">Manage cache and invalidate keys</p>
          </a>
        </div>

        {/* New Features */}
        <div className="grid gap-4 md:grid-cols-2">
          <a
            href="/admin/announcements"
            className="group relative rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6 backdrop-blur-xl hover:border-purple-400/40 transition-all shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/30">
                <MegaphoneIcon className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-300 transition-colors">Announcements</h3>
            <p className="text-sm text-slate-400">Create global announcements</p>
          </a>
          <a
            href="/admin/security"
            className="group relative rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6 backdrop-blur-xl hover:border-amber-400/40 transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/30">
                <LockClosedIcon className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-amber-300 transition-colors">Security Audit</h3>
            <p className="text-sm text-slate-400">Monitor failed login attempts</p>
          </a>
        </div>
    </div>
  );
};

export default AdminDashboardPage;

