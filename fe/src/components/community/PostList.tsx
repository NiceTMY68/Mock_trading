/**
 * PostList Component - Enhanced
 * 
 * Features:
 * - Sort by latest, trending
 * - Filter by following
 * - Infinite scroll ready
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import * as postsAPI from '../../api/posts';
import { getTrendingPosts } from '../../api/trending';
import PostCard from './PostCard';
import LoginModal from '../auth/LoginModal';
import { navigate } from '../../utils/navigation';
import { 
  ChatBubbleLeftEllipsisIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface PostListProps {
  sortBy?: 'latest' | 'trending';
  showFollowingOnly?: boolean;
  hashtag?: string;
  userId?: number;
}

const PostList = ({ 
  sortBy = 'latest', 
  showFollowingOnly = false,
  hashtag,
  userId 
}: PostListProps) => {
  const { isAuthenticated } = useAuthStore();
  const [page, setPage] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Regular posts query
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['posts', page, sortBy, showFollowingOnly, hashtag, userId],
    queryFn: async () => {
      if (sortBy === 'trending') {
        const result = await getTrendingPosts(page, 10, 7);
        return {
          posts: result.posts.map(p => ({
            id: p.id,
            title: p.title,
            content: p.content,
            tags: p.tags,
            viewCount: p.viewCount,
            bookmarkCount: p.bookmarkCount,
            reactionsCount: p.reactionsCount,
            commentsCount: p.commentsCount,
            authorName: p.authorName,
            authorAvatar: p.authorAvatar,
            createdAt: p.createdAt,
          })),
          pagination: { 
            total: result.total, 
            pages: Math.ceil(result.total / 10),
            page,
            size: 10
          }
        };
      }
      
      return postsAPI.getPosts({ 
        page, 
        size: 10, 
        status: 'published',
        followingOnly: showFollowingOnly && isAuthenticated,
        hashtag,
        userId
      });
    },
    staleTime: 30_000,
    // Auto-refetch only for 'latest' tab, not for trending or following
    refetchInterval: (sortBy === 'latest' && !showFollowingOnly) ? 60_000 : undefined
  });

  const handleViewPost = (post: postsAPI.Post) => {
    navigate(`/community/post/${post.id}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 animate-pulse"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-white/10" />
              <div className="flex-1">
                <div className="h-4 bg-white/10 rounded w-1/4 mb-2" />
                <div className="h-3 bg-white/5 rounded w-1/6" />
              </div>
            </div>
            <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
            <div className="h-4 bg-white/5 rounded w-full mb-2" />
            <div className="h-4 bg-white/5 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <p className="text-rose-400 font-medium mb-2">Không thể tải bài viết</p>
        <p className="text-rose-400/70 text-sm mb-4">Vui lòng thử lại sau</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 
                   text-rose-400 hover:bg-rose-500/30 transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Thử lại
        </button>
      </div>
    );
  }

  const posts = data?.posts || [];
  const pagination = data?.pagination;

  // Empty state
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
        <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          {showFollowingOnly 
            ? 'Chưa có bài viết từ người bạn theo dõi'
            : 'Chưa có bài viết nào'
          }
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          {showFollowingOnly
            ? 'Theo dõi thêm người dùng để xem bài viết của họ'
            : 'Hãy là người đầu tiên chia sẻ suy nghĩ!'
          }
        </p>
        {!isAuthenticated && (
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium 
                     hover:bg-emerald-600 transition-colors"
          >
            Đăng nhập để đăng bài
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Refresh indicator */}
      {isFetching && !isLoading && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-400">
          <ArrowPathIcon className="w-4 h-4 animate-spin" />
          Đang cập nhật...
        </div>
      )}

      {/* Posts */}
      {posts.map((post) => (
        <PostCard 
          key={post.id} 
          post={post as postsAPI.Post} 
          onView={handleViewPost} 
        />
      ))}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-medium
                     text-white hover:bg-white/5 hover:border-white/20
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Trước
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              let pageNum;
              if (pagination.pages <= 5) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > pagination.pages - 4) {
                pageNum = pagination.pages - 5 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                    page === pageNum
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page + 1 >= pagination.pages}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-medium
                     text-white hover:bg-white/5 hover:border-white/20
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Sau
          </button>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
};

export default PostList;
