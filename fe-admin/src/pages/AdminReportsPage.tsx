import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { getReports, updateReportStatus } from '../api/reports';
import { formatDistanceToNow } from 'date-fns';

interface Report {
  id: number;
  reporter_id: number;
  target_type: 'post' | 'comment' | 'user';
  target_id: number;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_notes?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  created_at: string;
  reporter_name?: string;
  reported_content?: string;
}

const AdminReportsPage = () => {
    const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ['admin-reports', statusFilter],
    queryFn: () => getReports({ status: statusFilter || undefined }),
    enabled: user?.role === 'admin'
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: number; status: string }) =>
      updateReportStatus(reportId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    }
  });

  const handleStatusChange = (report: Report, newStatus: 'pending' | 'reviewed' | 'resolved' | 'dismissed') => {
    updateStatusMutation.mutate({ reportId: report.id, status: newStatus });
  };

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
            <h1 className="text-3xl font-bold text-white mb-2">Reports Management</h1>
            <p className="text-slate-400">Review and resolve user reports</p>
          </div>
          <a
            href="/admin"
            className="text-sm text-slate-400 hover:text-emerald-400 transition"
          >
            ← Back to Admin Dashboard
          </a>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 h-32 animate-pulse" />
            ))
          ) : !reports || reports.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-8 text-center text-slate-400">
              No reports found
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 text-xs rounded-full bg-amber-400/20 text-amber-300">
                        {report.target_type}
                      </span>
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${
                          report.status === 'pending'
                            ? 'bg-amber-400/20 text-amber-300'
                            : report.status === 'resolved'
                            ? 'bg-emerald-400/20 text-emerald-300'
                            : report.status === 'dismissed'
                            ? 'bg-slate-400/20 text-slate-300'
                            : 'bg-blue-400/20 text-blue-300'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">
                      <span className="font-semibold">Reason:</span> {report.reason}
                    </p>
                    {report.reported_content && (
                      <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                        <span className="font-semibold">Content:</span> {report.reported_content}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Reported by: {report.reporter_name || `User ${report.reporter_id}`}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                  <select
                    value={report.status}
                    onChange={(e) => handleStatusChange(report, e.target.value as any)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white focus:border-emerald-400 focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                  {report.target_type === 'post' && (
                    <a
                      href={`/posts/${report.target_id}`}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white hover:border-emerald-400 transition"
                    >
                      View {report.target_type}
                    </a>
                  )}
                  {report.target_type === 'comment' && (
                    <a
                      href={`/posts/${report.target_id}`}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white hover:border-emerald-400 transition"
                    >
                      View Comment
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>    </div>
  );
};

export default AdminReportsPage;

