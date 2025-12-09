import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FireIcon, 
  ArrowTrendingUpIcon,
  HashtagIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import PageLayout from '../components/layout/PageLayout';
import { getTrendingPosts, getTrendingHashtags, TrendingPost } from '../api/trending';
import { navigate } from '../utils/navigation';

type TimeRange = 7 | 30 | 90;

const TrendingPage = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<'posts' | 'hashtags'>('posts');

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['trending-posts', timeRange, page],
    queryFn: () => getTrendingPosts(page, 20, timeRange),
  });

  const { data: hashtags, isLoading: hashtagsLoading } = useQuery({
    queryKey: ['trending-hashtags', timeRange],
    queryFn: () => getTrendingHashtags(50, timeRange),
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours}h trước`;
    if (hours < 48) return 'Hôm qua';
    return date.toLocaleDateString('vi-VN');
  };

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: 7, label: '7 ngày' },
    { value: 30, label: '30 ngày' },
    { value: 90, label: '90 ngày' },
  ];

  return (
    <PageLayout>
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 
                          flex items-center justify-center shadow-lg shadow-orange-500/20">
              <FireIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Trending</h1>
              <p className="text-slate-400">Discover trending content in the community</p>
            </div>
          </div>

          {/* Tabs & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'posts'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowTrendingUpIcon className="w-4 h-4" />
                Posts
              </button>
              <button
                onClick={() => setActiveTab('hashtags')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'hashtags'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <HashtagIcon className="w-4 h-4" />
                Hashtags
              </button>
            </div>

            {/* Time range filter */}
            <div className="flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="w-4 h-4 text-slate-400" />
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => { setTimeRange(range.value); setPage(0); }}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    timeRange === range.value
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        {activeTab === 'posts' ? (
          <section>
            {postsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-white/5 rounded-2xl p-5 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10" />
                      <div className="flex-1">
                        <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
                        <div className="h-4 bg-white/5 rounded w-full mb-2" />
                        <div className="h-4 bg-white/5 rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {postsData?.posts.map((post, index) => (
                  <TrendingPostCard 
                    key={post.id} 
                    post={post} 
                    rank={page * 20 + index + 1}
                    formatDate={formatDate}
                  />
                ))}

                {/* Pagination */}
                {postsData && postsData.total > 20 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 
                               hover:bg-white/10 disabled:opacity-50 transition-colors"
                    >
                      Trước
                    </button>
                    <span className="px-5 py-2.5 text-slate-400">
                      Trang {page + 1} / {Math.ceil(postsData.total / 20)}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={(page + 1) * 20 >= postsData.total}
                      className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 
                               hover:bg-white/10 disabled:opacity-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <section>
            {hashtagsLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white/5 rounded-2xl p-5 animate-pulse">
                    <div className="h-6 bg-white/10 rounded w-1/2 mb-2" />
                    <div className="h-4 bg-white/5 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {hashtags?.map((tag, index) => (
                  <button
                    key={tag.id}
                    onClick={() => navigate(`/community/hashtag/${tag.name}`)}
                    className="group bg-white/5 hover:bg-white/[0.07] border border-white/10 
                             hover:border-emerald-500/30 rounded-2xl p-5 text-left transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`
                        w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0
                        ${index < 3 
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' 
                          : 'bg-white/10 text-slate-400'
                        }
                      `}>
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 
                                     transition-colors">
                          #{tag.name}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {tag.postCount} posts
                          {tag.recentPosts > 0 && (
                            <span className="text-emerald-400 ml-2">
                              +{tag.recentPosts} new
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </PageLayout>
  );
};

// Trending Post Card Component
const TrendingPostCard = ({ 
  post, 
  rank,
  formatDate 
}: { 
  post: TrendingPost; 
  rank: number;
  formatDate: (date: string) => string;
}) => {
  const getRankBadge = () => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white';
    if (rank === 2) return 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800';
    if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-700 text-white';
    return 'bg-white/10 text-slate-400';
  };

  return (
    <article
      onClick={() => navigate(`/community/post/${post.id}`)}
      className="group bg-white/5 hover:bg-white/[0.07] border border-white/10 
               hover:border-emerald-500/20 rounded-2xl p-5 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0
          ${getRankBadge()}
        `}>
          {rank}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Author */}
          <div className="flex items-center gap-2 mb-2">
            <img
              src={post.authorAvatar || `https://ui-avatars.com/api/?name=${post.authorName}&background=random`}
              alt=""
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm text-slate-400">{post.authorName}</span>
            <span className="text-slate-600">•</span>
            <span className="text-sm text-slate-500 flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              {formatDate(post.createdAt)}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 
                       transition-colors line-clamp-2 mb-2">
            {post.title || post.content.slice(0, 80)}
          </h3>

          {/* Content preview */}
          {post.title && (
            <p className="text-sm text-slate-400 line-clamp-2 mb-3">
              {post.content}
            </p>
          )}

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/community/hashtag/${tag}`);
                  }}
                  className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-400 
                           border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-slate-500">
              <EyeIcon className="w-4 h-4" />
              {post.viewCount}
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <HeartIcon className="w-4 h-4" />
              {post.reactionsCount}
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <ChatBubbleLeftIcon className="w-4 h-4" />
              {post.commentsCount}
            </span>
            
            {/* Trending score indicator */}
            <span className="ml-auto flex items-center gap-1 text-amber-400">
              <FireIcon className="w-4 h-4" />
              <span className="text-xs font-medium">
                {Math.round(post.trendingScore * 10) / 10}
              </span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default TrendingPage;

