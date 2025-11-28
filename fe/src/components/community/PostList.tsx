import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import * as postsAPI from '../../api/posts';
import PostCard from './PostCard';
import CreatePostForm from './CreatePostForm';
import LoginModal from '../auth/LoginModal';

const PostList = () => {
  const { isAuthenticated } = useAuthStore();
  const [page, setPage] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['posts', page],
    queryFn: () => postsAPI.getPosts({ page, size: 10, status: 'published' }),
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const handleViewPost = (post: postsAPI.Post) => {
    const { navigate } = require('../../utils/navigation');
    navigate(`/posts/${post.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-1/3 mb-3"></div>
            <div className="h-6 bg-white/10 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-center">
        <p className="text-rose-400">Failed to load posts. Please try again later.</p>
      </div>
    );
  }

  const posts = data?.posts || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Community Posts</h2>
          <p className="text-sm text-slate-400 mt-1">Share your thoughts and insights</p>
        </div>
        {isAuthenticated && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition"
          >
            {showCreateForm ? 'Cancel' : '+ New Post'}
          </button>
        )}
      </div>

      {/* Create Post Form */}
      {showCreateForm && isAuthenticated && (
        <CreatePostForm onSuccess={() => setShowCreateForm(false)} />
      )}

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-8 text-center">
          <p className="text-slate-400 mb-2">No posts yet</p>
          {isAuthenticated ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-emerald-400 hover:text-emerald-300"
            >
              Be the first to post!
            </button>
          ) : (
            <p className="text-sm text-slate-500">
              <a href="/login" className="text-emerald-400 hover:text-emerald-300 underline">
                Login
              </a>{' '}
              to create posts
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onView={handleViewPost} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:border-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {page + 1} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page + 1 >= pagination.pages}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:border-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
};

export default PostList;

