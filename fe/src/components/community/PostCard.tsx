import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { Post } from '../../api/posts';
import * as postsAPI from '../../api/posts';
import { formatDistanceToNow } from 'date-fns';
import PublicProfileView from '../profile/PublicProfileView';
import ReportButton from './ReportButton';

interface PostCardProps {
  post: Post;
  onView?: (post: Post) => void;
}

const PostCard = ({ post, onView }: PostCardProps) => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [showFullContent, setShowFullContent] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const toggleReactionMutation = useMutation({
    mutationFn: (type: string) => postsAPI.toggleReaction(post.id, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', post.id] });
    }
  });

  const handleReaction = (type: string) => {
    if (!isAuthenticated) {
      alert('Please login to react');
      return;
    }
    toggleReactionMutation.mutate(type);
  };

  const contentPreview = post.content.length > 200 
    ? post.content.substring(0, 200) + '...'
    : post.content;

  return (
    <article className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 hover:border-emerald-300/40 transition">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => post.userId && setShowProfile(true)}
            className="flex items-center gap-3 hover:opacity-80 transition"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {post.authorName?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{post.authorName || 'Anonymous'}</p>
              <p className="text-xs text-slate-400">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </button>
        </div>
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <h3
        className="text-lg font-semibold text-white mb-2 cursor-pointer hover:text-emerald-300 transition"
        onClick={() => onView?.(post)}
      >
        {post.title}
      </h3>

      {/* Content */}
      <div className="mb-4">
        <p className="text-sm text-slate-300 whitespace-pre-wrap">
          {showFullContent ? post.content : contentPreview}
        </p>
        {post.content.length > 200 && (
          <button
            onClick={() => setShowFullContent(!showFullContent)}
            className="text-xs text-emerald-400 hover:text-emerald-300 mt-1"
          >
            {showFullContent ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleReaction('like')}
            disabled={!isAuthenticated || toggleReactionMutation.isPending}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition disabled:opacity-50"
          >
            <span>👍</span>
            <span>{post.reactionsCount || 0}</span>
          </button>
          <button
            onClick={() => {
              if (onView) {
                onView(post);
              } else {
                const { navigate } = require('../../utils/navigation');
                navigate(`/posts/${post.id}`);
              }
            }}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition"
          >
            <span>💬</span>
            <span>{post.commentsCount || 0}</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (onView) {
                onView(post);
              } else {
                const { navigate } = require('../../utils/navigation');
                navigate(`/posts/${post.id}`);
              }
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            View →
          </button>
          {isAuthenticated && post.userId && (
            <ReportButton targetType="post" targetId={post.id} />
          )}
        </div>
      </div>
      {showProfile && post.userId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            <PublicProfileView userId={post.userId} onClose={() => setShowProfile(false)} />
          </div>
        </div>
      )}
    </article>
  );
};

export default PostCard;

