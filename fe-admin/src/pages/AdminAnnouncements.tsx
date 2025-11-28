import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { getAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, Announcement, CreateAnnouncementRequest } from '../api/announcements';
import { format } from 'date-fns';

const AdminAnnouncementsPage = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [isActiveFilter, setIsActiveFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-announcements', page, isActiveFilter, typeFilter],
    queryFn: () =>
      getAllAnnouncements({
        page,
        size: 20,
        isActive: isActiveFilter === 'true' ? true : isActiveFilter === 'false' ? false : undefined,
        type: typeFilter || undefined
      }),
    enabled: user?.role === 'admin'
  });

  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setShowCreateForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateAnnouncement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setEditingAnnouncement(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    }
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

  const announcements = data?.announcements || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Global Announcements</h1>
            <p className="text-slate-400">Create and manage system-wide announcements</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition"
            >
              + New Announcement
            </button>
            <a
              href="/admin"
              className="text-sm text-slate-400 hover:text-emerald-400 transition"
            >
              ← Back
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
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
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Create/Edit Form */}
        {(showCreateForm || editingAnnouncement) && (
          <AnnouncementForm
            announcement={editingAnnouncement}
            onSave={(data) => {
              if (editingAnnouncement) {
                updateMutation.mutate({ id: editingAnnouncement.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowCreateForm(false);
              setEditingAnnouncement(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}

        {/* Announcements List */}
        <div className="space-y-4">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 h-32 animate-pulse" />
            ))
          ) : announcements.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-8 text-center text-slate-400">
              No announcements found
            </div>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{announcement.title}</h3>
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${
                          announcement.type === 'info'
                            ? 'bg-blue-400/20 text-blue-300'
                            : announcement.type === 'warning'
                            ? 'bg-amber-400/20 text-amber-300'
                            : announcement.type === 'success'
                            ? 'bg-emerald-400/20 text-emerald-300'
                            : 'bg-rose-400/20 text-rose-300'
                        }`}
                      >
                        {announcement.type}
                      </span>
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${
                          announcement.isActive
                            ? 'bg-emerald-400/20 text-emerald-300'
                            : 'bg-slate-400/20 text-slate-300'
                        }`}
                      >
                        {announcement.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mb-3 whitespace-pre-wrap">{announcement.content}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Priority: {announcement.priority}</span>
                      <span>•</span>
                      <span>Starts: {format(new Date(announcement.startsAt), 'MMM d, yyyy HH:mm')}</span>
                      {announcement.endsAt && (
                        <>
                          <span>•</span>
                          <span>Ends: {format(new Date(announcement.endsAt), 'MMM d, yyyy HH:mm')}</span>
                        </>
                      )}
                      {announcement.createdByName && (
                        <>
                          <span>•</span>
                          <span>By: {announcement.createdByName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setEditingAnnouncement(announcement)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white hover:border-emerald-400 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete announcement "${announcement.title}"?`)) {
                        deleteMutation.mutate(announcement.id);
                      }
                    }}
                    className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-sm text-rose-300 hover:bg-rose-400/20 transition"
                  >
                    Delete
                  </button>
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
              Page {page + 1} of {pagination.pages}
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

// Announcement Form Component
const AnnouncementForm = ({ 
  announcement, 
  onSave, 
  onCancel, 
  isLoading 
}: { 
  announcement: Announcement | null;
  onSave: (data: CreateAnnouncementRequest & { isActive?: boolean }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    content: announcement?.content || '',
    type: announcement?.type || 'info' as const,
    priority: announcement?.priority || 'normal' as const,
    isActive: announcement?.isActive ?? true,
    startsAt: announcement?.startsAt ? format(new Date(announcement.startsAt), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endsAt: announcement?.endsAt ? format(new Date(announcement.endsAt), "yyyy-MM-dd'T'HH:mm") : ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      alert('Title and content are required');
      return;
    }
    onSave({
      title: formData.title,
      content: formData.content,
      type: formData.type,
      priority: formData.priority,
      startsAt: formData.startsAt,
      endsAt: formData.endsAt || null,
      isActive: formData.isActive
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-white/5 bg-slate-900/60 p-6 space-y-4">
      <h3 className="text-xl font-semibold text-white mb-4">
        {announcement ? 'Edit Announcement' : 'Create New Announcement'}
      </h3>

      <div>
        <label className="block text-sm text-slate-400 mb-2">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-2">Content</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={6}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none resize-none"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Starts At</label>
          <input
            type="datetime-local"
            value={formData.startsAt}
            onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">Ends At (optional)</label>
          <input
            type="datetime-local"
            value={formData.endsAt}
            onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="rounded border-white/10"
        />
        <label htmlFor="isActive" className="text-sm text-slate-400">Active</label>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-white/20 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : announcement ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default AdminAnnouncementsPage;

