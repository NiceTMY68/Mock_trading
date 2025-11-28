import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { getPostsForModeration, updatePostStatus, deletePost, togglePinPost, toggleFeaturePost, AdminPost } from '../api/admin';
import { formatDistanceToNow } from 'date-fns';

const AdminPostsPage = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-posts', page, statusFilter, search],
    queryFn: () =>
      getPostsForModeration({
        page,
        size: 20,
        status: statusFilter || undefined,
        search: search || undefined
      }),
    enabled: user?.role === 'admin'
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ postId, status }: { postId: number; status: string }) =>
      updatePostStatus(postId, status as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const pinPostMutation = useMutation({
    mutationFn: ({ postId, pinned }: { postId: number; pinned: boolean }) =>
      togglePinPost(postId, pinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const featurePostMutation = useMutation({
    mutationFn: ({ postId, featured }: { postId: number; featured: boolean }) =>
      toggleFeaturePost(postId, featured),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const handleStatusChange = (post: AdminPost, newStatus: 'pending' | 'published' | 'rejected' | 'archived') => {
    updateStatusMutation.mutate({ postId: post.id, status: newStatus });
  };

  const handleDelete = (post: AdminPost) => {
    if (confirm(`Delete post "${post.title}"? This action cannot be undone.`)) {
      deletePostMutation.mutate(post.id);
    }
  };

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

  const posts = data?.posts || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Content Moderation</h1>
            <p className="text-slate-400">Approve, reject, and manage posts</p>
          </div>
          <a
            href="/admin"
            className="text-sm text-slate-400 hover:text-emerald-400 transition"
          >
            ← Back to Admin Dashboard
          </a>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search posts..."
            className="flex-1 min-w-64 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 h-32 animate-pulse" />
            ))
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-8 text-center text-slate-400">
              No posts found
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{post.title}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-3">{post.content}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>By {post.authorName} ({post.authorEmail})</span>
                      <span>•</span>
                      <span>{post.commentsCount} comments</span>
                      <span>•</span>
                      <span>{post.reactionsCount} reactions</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span
                      className={`px-3 py-1 text-xs rounded-full ${
                        post.status === 'published'
                          ? 'bg-emerald-400/20 text-emerald-300'
                          : post.status === 'pending'
                          ? 'bg-amber-400/20 text-amber-300'
                          : post.status === 'rejected'
                          ? 'bg-rose-400/20 text-rose-300'
                          : 'bg-slate-400/20 text-slate-300'
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-white/5 flex-wrap">
                  <select
                    value={post.status}
                    onChange={(e) => handleStatusChange(post, e.target.value as any)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white focus:border-emerald-400 focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="published">Published</option>
                    <option value="rejected">Rejected</option>
                    <option value="archived">Archived</option>
                  </select>
                  <button
                    onClick={() => pinPostMutation.mutate({ postId: post.id, pinned: !(post as any).is_pinned })}
                    className={`rounded-lg border px-3 py-1 text-sm transition ${
                      (post as any).is_pinned
                        ? 'border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'
                        : 'border-white/10 bg-white/5 text-white hover:border-amber-400'
                    }`}
                  >
                    {(post as any).is_pinned ? '📌 Pinned' : '📌 Pin'}
                  </button>
                  <button
                    onClick={() => featurePostMutation.mutate({ postId: post.id, featured: !(post as any).is_featured })}
                    className={`rounded-lg border px-3 py-1 text-sm transition ${
                      (post as any).is_featured
                        ? 'border-purple-400/30 bg-purple-400/10 text-purple-300 hover:bg-purple-400/20'
                        : 'border-white/10 bg-white/5 text-white hover:border-purple-400'
                    }`}
                  >
                    {(post as any).is_featured ? '⭐ Featured' : '⭐ Feature'}
                  </button>
                  <a
                    href={`/posts/${post.id}`}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white hover:border-emerald-400 transition"
                  >
                    View
                  </a>
                  <button
                    onClick={() => handleDelete(post)}
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

export default AdminPostsPage;

