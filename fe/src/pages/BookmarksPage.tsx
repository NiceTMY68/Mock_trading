/**
 * BookmarksPage
 * 
 * Trang hiển thị bài viết đã lưu với bộ lọc collections
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BookmarkIcon, 
  FolderIcon,
  TrashIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';
import PageLayout from '../components/layout/PageLayout';
import { getBookmarks, getCollections, removeBookmark, moveToCollection, Bookmark } from '../api/bookmarks';
import { navigate } from '../utils/navigation';

const BookmarksPage = () => {
  const [selectedCollection, setSelectedCollection] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data: collectionsData = [] } = useQuery({
    queryKey: ['bookmark-collections'],
    queryFn: getCollections,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['bookmarks', selectedCollection, page],
    queryFn: () => getBookmarks(page, 20, selectedCollection),
  });

  const removeMutation = useMutation({
    mutationFn: removeBookmark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['bookmark-collections'] });
    }
  });

  const moveMutation = useMutation({
    mutationFn: ({ postId, collection }: { postId: number; collection: string }) => 
      moveToCollection(postId, collection),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['bookmark-collections'] });
    }
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const totalBookmarks = collectionsData.reduce((sum, c) => sum + c.count, 0);

  return (
    <PageLayout>
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 
                        flex items-center justify-center shadow-lg shadow-amber-500/20">
            <BookmarkSolid className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Bài viết đã lưu</h1>
            <p className="text-slate-400 text-sm">{totalBookmarks} bài viết</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar - Collections */}
          <aside className="space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">
              Bộ sưu tập
            </h2>
            
            {/* All bookmarks */}
            <button
              onClick={() => setSelectedCollection(undefined)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                !selectedCollection 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <BookmarkIcon className="w-5 h-5" />
              <span className="flex-1 text-left text-sm font-medium">Tất cả</span>
              <span className="text-xs text-slate-500">{totalBookmarks}</span>
            </button>

            {/* Collection list */}
            {collectionsData.map((collection) => (
              <button
                key={collection.collection}
                onClick={() => setSelectedCollection(collection.collection)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  selectedCollection === collection.collection
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <FolderIcon className="w-5 h-5" />
                <span className="flex-1 text-left text-sm font-medium truncate">
                  {collection.collection === 'default' ? 'Mặc định' : collection.collection}
                </span>
                <span className="text-xs text-slate-500">{collection.count}</span>
              </button>
            ))}
          </aside>

          {/* Main content */}
          <section>
            {isLoading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white/5 rounded-2xl p-5 animate-pulse">
                    <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
                    <div className="h-4 bg-white/5 rounded w-full mb-2" />
                    <div className="h-4 bg-white/5 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : data?.bookmarks.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 
                              flex items-center justify-center">
                  <BookmarkIcon className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Chưa có bài viết nào</h3>
                <p className="text-slate-400 text-sm">
                  Bài viết bạn lưu sẽ xuất hiện ở đây
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {data?.bookmarks.map((bookmark) => (
                  <article 
                    key={bookmark.id}
                    className="group bg-white/5 hover:bg-white/[0.07] border border-white/10 
                             rounded-2xl p-5 transition-all duration-300 cursor-pointer"
                    onClick={() => navigate(`/community/post/${bookmark.post_id}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h3 className="text-lg font-semibold text-white mb-2 
                                     group-hover:text-emerald-400 transition-colors line-clamp-1">
                          {bookmark.title || 'Không có tiêu đề'}
                        </h3>
                        
                        {/* Content preview */}
                        <p className="text-slate-400 text-sm line-clamp-2 mb-3">
                          {bookmark.content}
                        </p>

                        {/* Tags */}
                        {bookmark.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {bookmark.tags.slice(0, 3).map((tag) => (
                              <span 
                                key={tag}
                                className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 
                                         text-emerald-400 border border-emerald-500/20"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <img 
                              src={bookmark.author_avatar || `https://ui-avatars.com/api/?name=${bookmark.author_name}&background=random`}
                              alt=""
                              className="w-5 h-5 rounded-full"
                            />
                            {bookmark.author_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {formatDate(bookmark.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <EyeIcon className="w-3.5 h-3.5" />
                            {bookmark.view_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <HeartIcon className="w-3.5 h-3.5" />
                            {bookmark.reactions_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                            {bookmark.comments_count}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                           onClick={(e) => e.stopPropagation()}>
                        {/* Move to collection */}
                        <select
                          className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 
                                   text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              moveMutation.mutate({ 
                                postId: bookmark.post_id, 
                                collection: e.target.value 
                              });
                            }
                          }}
                        >
                          <option value="">Di chuyển...</option>
                          {collectionsData.map((c) => (
                            <option key={c.collection} value={c.collection}>
                              {c.collection === 'default' ? 'Mặc định' : c.collection}
                            </option>
                          ))}
                        </select>

                        {/* Remove */}
                        <button
                          onClick={() => removeMutation.mutate(bookmark.post_id)}
                          className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 
                                   hover:text-rose-400 transition-colors"
                          title="Bỏ lưu"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                {/* Pagination */}
                {data && data.total > 20 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 
                               hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Trước
                    </button>
                    <span className="px-4 py-2 text-slate-400">
                      Trang {page + 1} / {Math.ceil(data.total / 20)}
                    </span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={(page + 1) * 20 >= data.total}
                      className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 
                               hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </PageLayout>
  );
};

export default BookmarksPage;

