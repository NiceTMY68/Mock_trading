import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { Post } from '../../api/posts';
import * as postsAPI from '../../api/posts';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import PublicProfileView from '../profile/PublicProfileView';
import ReportButton from './ReportButton';
import BookmarkButton from '../common/BookmarkButton';
import ImageGallery from '../common/ImageGallery';
import LoginModal from '../auth/LoginModal';
import { navigate } from '../../utils/navigation';
import { Linkify } from '../../utils/linkify';
import { 
  HeartIcon, 
  ChatBubbleLeftIcon, 
  EyeIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

interface PostCardProps {
  post: Post;
  onView?: (post: Post) => void;
}

const PostCard = ({ post, onView }: PostCardProps) => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  
  const postData = {
    ...post,
    createdAt: post.createdAt || (post as any).created_at,
    userId: post.userId || (post as any).user_id,
    authorName: post.authorName || (post as any).author_name,
    authorAvatar: post.authorAvatar || (post as any).author_avatar,
    commentsCount: post.commentsCount ?? (post as any).comments_count ?? 0,
    reactionsCount: post.reactionsCount ?? (post as any).reactions_count ?? 0,
    viewCount: post.viewCount ?? (post as any).view_count ?? 0,
    bookmarkCount: post.bookmarkCount ?? (post as any).bookmark_count ?? 0,
    images: post.images || (post as any).images || [],
    hashtags: post.hashtags || (post as any).hashtags || post.tags || [],
    userReaction: post.userReaction || (post as any).user_reaction,
  };

  const [showFullContent, setShowFullContent] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const toggleReactionMutation = useMutation({
    mutationFn: (type: string) => postsAPI.toggleReaction(post.id, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', post.id] });
    }
  });

  const requireAuth = (callback: () => void) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    callback();
  };

  const handleReaction = (type: string) => {
    requireAuth(() => {
      setIsLikeAnimating(true);
      setTimeout(() => setIsLikeAnimating(false), 600);
      toggleReactionMutation.mutate(type);
    });
  };

  const handleComment = () => {
    requireAuth(() => {
      onView?.(post) ?? navigate(`/community/post/${post.id}`);
    });
  };

  const handleBookmarkClick = () => {
    setShowLoginModal(true);
  };

  const handleHashtagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    navigate(`/community/hashtag/${tag}`);
  };

  const contentPreview = post.content.length > 280 
    ? post.content.substring(0, 280) + '...'
    : post.content;

  const hasImages = postData.images && postData.images.length > 0;
  const isLiked = postData.userReaction === 'like';

  return (
    <article className="group relative rounded-2xl border border-white/5 bg-gradient-to-b from-slate-900/80 to-slate-900/40 
                      backdrop-blur-sm overflow-hidden transition-all duration-300
                      hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5">
      <div className="flex items-start justify-between p-5 pb-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => postData.userId && setShowProfile(true)}
            className="relative group/avatar"
          >
            {postData.authorAvatar ? (
              <img 
                src={postData.authorAvatar}
                alt=""
                className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10 
                         group-hover/avatar:ring-emerald-400/50 transition-all"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 
                            flex items-center justify-center ring-2 ring-white/10
                            group-hover/avatar:ring-emerald-400/50 transition-all">
                <span className="text-white font-bold text-sm">
                  {postData.authorName?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 
                           rounded-full border-2 border-slate-900" />
          </button>
          
          <div>
            <button
              onClick={() => postData.userId && setShowProfile(true)}
              className="text-sm font-semibold text-white hover:text-emerald-400 transition"
            >
              {postData.authorName || 'Anonymous'}
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>
                {postData.createdAt 
                  ? formatDistanceToNow(new Date(postData.createdAt), { 
                      addSuffix: true,
                      locale: vi 
                    })
                  : 'vừa xong'}
              </span>
              {postData.viewCount > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <EyeIcon className="w-3 h-3" />
                    {postData.viewCount}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition"
          >
            <EllipsisHorizontalIcon className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-48 py-1 rounded-xl 
                            bg-slate-800 border border-white/10 shadow-xl">
                {isAuthenticated && postData.userId && (
                  <ReportButton 
                    targetType="post" 
                    targetId={post.id}
                    variant="menuItem"
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-5 py-3">
        {post.title && (
          <h3
            className="text-lg font-semibold text-white mb-2 cursor-pointer 
                     hover:text-emerald-400 transition-colors line-clamp-2"
            onClick={() => onView?.(post) ?? navigate(`/community/post/${post.id}`)}
          >
            {post.title}
          </h3>
        )}

        <div className="mb-3">
          <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
            <Linkify>{showFullContent ? post.content : contentPreview}</Linkify>
          </p>
          {post.content.length > 280 && (
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="text-xs text-emerald-400 hover:text-emerald-300 mt-2 font-medium"
            >
              {showFullContent ? 'Thu gọn' : 'Xem thêm'}
            </button>
          )}
        </div>

        {postData.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {postData.hashtags.map((tag: string) => (
              <button
                key={tag}
                onClick={(e) => handleHashtagClick(e, tag)}
                className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 
                         border border-emerald-500/20 hover:bg-emerald-500/20 
                         hover:border-emerald-500/40 transition-all"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasImages && (
        <div className="px-5 pb-3">
          <ImageGallery 
            images={postData.images.map((img: any) => ({
              id: img.id,
              url: img.url,
              thumbnailUrl: img.thumbnailUrl || img.thumbnail_url,
            }))}
            maxVisible={4}
          />
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleReaction('like')}
            disabled={toggleReactionMutation.isPending}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
              ${isLiked 
                ? 'text-rose-400 hover:bg-rose-500/10' 
                : 'text-slate-400 hover:text-rose-400 hover:bg-white/5'
              }
              disabled:opacity-50
              ${isLikeAnimating ? 'scale-110' : ''}
            `}
          >
            {isLiked ? (
              <HeartSolid className={`w-5 h-5 ${isLikeAnimating ? 'animate-bounce' : ''}`} />
            ) : (
              <HeartIcon className="w-5 h-5" />
            )}
            <span>{postData.reactionsCount}</span>
          </button>

          <button
            onClick={handleComment}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                     text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-all"
          >
            <ChatBubbleLeftIcon className="w-5 h-5" />
            <span>{postData.commentsCount}</span>
          </button>
        </div>

        <BookmarkButton 
          postId={post.id}
          count={postData.bookmarkCount}
          showCount={postData.bookmarkCount > 0}
          onAuthRequired={handleBookmarkClick}
        />
      </div>

      {showProfile && postData.userId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowProfile(false)}
        >
          <div 
            className="relative w-full max-w-md animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <PublicProfileView 
              userId={postData.userId} 
              onClose={() => setShowProfile(false)} 
            />
          </div>
        </div>
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      <style>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </article>
  );
};

export default PostCard;
