/**
 * HashtagPage
 * 
 * Hiển thị bài viết theo hashtag
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  HashtagIcon, 
  AdjustmentsHorizontalIcon,
  FireIcon,
  ClockIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import PageLayout from '../components/layout/PageLayout';
import { getPostsByHashtag, getTrendingHashtags } from '../api/hashtags';
import { navigate } from '../utils/navigation';

const HashtagPage = () => {
  const { tag } = useParams<{ tag: string }>();
  const [sortBy, setSortBy] = useState<'created_at' | 'trending'>('trending');
  const [page, setPage] = useState(0);

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['hashtag-posts', tag, sortBy, page],
    queryFn: () => getPostsByHashtag(tag!, page, 20, sortBy),
    enabled: !!tag,
  });

  const { data: trendingTags } = useQuery({
    queryKey: ['trending-hashtags'],
    queryFn: () => getTrendingHashtags(10, 7),
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

  return (
    <PageLayout>
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 
                          flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <HashtagIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">#{tag}</h1>
              <p className="text-slate-400">
                {postsData?.total || 0} bài viết
              </p>
            </div>
          </div>

          {/* Sort options */}
          <div className="flex items-center gap-2 mt-6">
            <AdjustmentsHorizontalIcon className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400 mr-2">Sắp xếp:</span>
            
            <button
              onClick={() => setSortBy('trending')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1.5 ${
                sortBy === 'trending'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <FireIcon className="w-4 h-4" />
              Nổi bật
            </button>
            
            <button
              onClick={() => setSortBy('created_at')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1.5 ${
                sortBy === 'created_at'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <ClockIcon className="w-4 h-4" />
              Mới nhất
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-[1fr_280px] gap-8">
          {/* Posts */}
          <section>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white/5 rounded-2xl p-5 animate-pulse">
                    <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
                    <div className="h-4 bg-white/5 rounded w-full mb-2" />
                    <div className="h-4 bg-white/5 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : postsData?.posts.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                <HashtagIcon className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Chưa có bài viết</h3>
                <p className="text-slate-400 text-sm">
                  Hãy là người đầu tiên viết về #{tag}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {postsData?.posts.map((post) => (
                  <article
                    key={post.id}
                    onClick={() => navigate(`/community/post/${post.id}`)}
                    className="group bg-white/5 hover:bg-white/[0.07] border border-white/10 
                             rounded-2xl p-5 transition-all duration-300 cursor-pointer"
                  >
                    {/* Author info */}
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={post.author_avatar || `https://ui-avatars.com/api/?name=${post.author_name}&background=random`}
                        alt=""
                        className="w-10 h-10 rounded-full ring-2 ring-white/10"
                      />
                      <div>
                        <p className="font-medium text-white">{post.author_name}</p>
                        <p className="text-xs text-slate-500">{formatDate(post.created_at)}</p>
                      </div>
                    </div>

                    {/* Title */}
                    {post.title && (
                      <h3 className="text-lg font-semibold text-white mb-2 
                                   group-hover:text-emerald-400 transition-colors">
                        {post.title}
                      </h3>
                    )}

                    {/* Content */}
                    <p className="text-slate-300 line-clamp-3 mb-3">
                      {post.content}
                    </p>

                    {/* Tags */}
                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {post.tags.map((t) => (
                          <span
                            key={t}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/community/hashtag/${t}`);
                            }}
                            className={`px-2 py-0.5 text-xs rounded-full transition-colors cursor-pointer ${
                              t === tag
                                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                                : 'bg-white/10 text-slate-400 hover:bg-white/20'
                            }`}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <EyeIcon className="w-4 h-4" />
                        {post.view_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <HeartIcon className="w-4 h-4" />
                        {post.reactions_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <ChatBubbleLeftIcon className="w-4 h-4" />
                        {post.comments_count}
                      </span>
                    </div>
                  </article>
                ))}

                {/* Pagination */}
                {postsData && postsData.total > 20 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 
                               hover:bg-white/10 disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <span className="px-4 py-2 text-slate-400">
                      {page + 1} / {Math.ceil(postsData.total / 20)}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={(page + 1) * 20 >= postsData.total}
                      className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 
                               hover:bg-white/10 disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Sidebar - Related hashtags */}
          <aside>
            <div className="sticky top-24 bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <FireIcon className="w-5 h-5 text-orange-400" />
                Hashtag phổ biến
              </h3>

              <div className="flex flex-wrap gap-2">
                {trendingTags?.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/community/hashtag/${t.name}`)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                      t.name === tag
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    #{t.name}
                    <span className="ml-1 text-xs text-slate-500">{t.postCount}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </PageLayout>
  );
};

export default HashtagPage;

