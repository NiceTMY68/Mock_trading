import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { useParams, useNavigate } from 'react-router-dom';
import * as postsAPI from '../../api/posts';
import { formatDistanceToNow } from 'date-fns';
import CommentList from './CommentList';
import CreateCommentForm from './CreateCommentForm';
import { Linkify } from '../../utils/linkify';

const PostDetail = () => {
  // Get ID from URL
  const pathParts = window.location.pathname.split('/');
  const id = pathParts[pathParts.length - 1];
  const navigate = (path: string) => {
    window.location.href = path;
  };
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsAPI.getPost(Number(id)),
    enabled: !!id && !isNaN(Number(id))
  });

  const toggleReactionMutation = useMutation({
    mutationFn: (type: string) => postsAPI.toggleReaction(Number(id), type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: () => postsAPI.deletePost(Number(id)),
    onSuccess: () => {
      navigate('/community');
    }
  });

  const handleReaction = (type: string) => {
    if (!isAuthenticated) {
      alert('Please login to react');
      return;
    }
    toggleReactionMutation.mutate(type);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this post?')) {
      deletePostMutation.mutate();
    }
  };

  const reactionTypes = [
    { type: 'like', emoji: '👍', label: 'Like' },
    { type: 'love', emoji: '❤️', label: 'Love' },
    { type: 'laugh', emoji: '😂', label: 'Laugh' },
    { type: 'wow', emoji: '😮', label: 'Wow' },
    { type: 'sad', emoji: '😢', label: 'Sad' },
    { type: 'angry', emoji: '😠', label: 'Angry' }
  ];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-8 animate-pulse">
        <div className="h-8 bg-white/10 rounded w-2/3 mb-4"></div>
        <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
        <div className="h-4 bg-white/10 rounded w-3/4"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">
        <p className="text-rose-400 mb-4">Post not found</p>
        <button
          onClick={() => navigate('/community')}
          className="text-emerald-400 hover:text-emerald-300"
        >
          ← Back to Community
        </button>
      </div>
    );
  }

  const isAuthor = isAuthenticated && user?.id === post.userId;
  const reactionCounts = post.reactions?.reduce((acc: Record<string, number>, r: postsAPI.Reaction) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/community')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition"
      >
        ← Back to Community
      </button>

      {/* Post Content */}
      <article className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
              <span className="text-white font-semibold">
                {post.authorName?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{post.authorName || 'Anonymous'}</p>
              <p className="text-xs text-slate-400">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          {isAuthor && (
            <div className="flex gap-2">
            <button
              onClick={() => navigate(`/posts/${id}/edit`)}
              className="text-xs text-slate-400 hover:text-emerald-400"
            >
              Edit
            </button>
              <button
                onClick={handleDelete}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-4">{post.title}</h1>

        {/* Content */}
        <div className="prose prose-invert max-w-none mb-6">
          <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
            <Linkify>{post.content}</Linkify>
          </p>
        </div>

        {/* Reactions */}
        <div className="border-t border-white/5 pt-4 mb-4">
          <div className="flex items-center gap-4 mb-3">
            {reactionTypes.map(({ type, emoji, label }) => {
              const count = reactionCounts[type] || 0;
              const isActive = post.userReaction?.type === type;
              
              return (
                <button
                  key={type}
                  onClick={() => handleReaction(type)}
                  disabled={!isAuthenticated || toggleReactionMutation.isPending}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full border transition ${
                    isActive
                      ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-emerald-400/40'
                  } disabled:opacity-50`}
                  title={label}
                >
                  <span className="text-lg">{emoji}</span>
                  {count > 0 && <span className="text-xs font-medium">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <button
            onClick={() => setShowCommentForm(!showCommentForm)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition"
          >
            <span>💬</span>
            <span>Comment ({post.commentsCount || 0})</span>
          </button>
          <div className="text-xs text-slate-500">
            {post.reactionsCount || 0} reactions • {post.commentsCount || 0} comments
          </div>
        </div>
      </article>

      {/* Create Comment Form */}
      {showCommentForm && isAuthenticated && (
        <CreateCommentForm
          postId={post.id}
          parentId={replyingTo}
          onSuccess={() => {
            setShowCommentForm(false);
            setReplyingTo(null);
          }}
        />
      )}

      {/* Comments Section */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Comments ({post.commentsCount || 0})
        </h2>
        {isAuthenticated ? (
          <CommentList
            postId={post.id}
            comments={post.comments || []}
            onReply={(commentId) => {
              setReplyingTo(commentId);
              setShowCommentForm(true);
            }}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-2">Login to view and add comments</p>
            <a href="/login" className="text-emerald-400 hover:text-emerald-300 underline">
              Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetail;

