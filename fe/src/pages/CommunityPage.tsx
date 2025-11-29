/**
 * CommunityPage - Enhanced
 * 
 * Main community feed with trending sidebar
 */

import { useState } from 'react';
import { 
  SparklesIcon, 
  FireIcon, 
  ClockIcon,
  BookmarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import PageLayout from '../components/layout/PageLayout';
import PostList from '../components/community/PostList';
import CreatePostForm from '../components/community/CreatePostForm';
import TrendingSection from '../components/community/TrendingSection';
import { useAuthStore } from '../store/auth';
import { navigate } from '../utils/navigation';

type FeedTab = 'latest' | 'trending' | 'following';

const CommunityPage = () => {
  const { isAuthenticated } = useAuthStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [feedTab, setFeedTab] = useState<FeedTab>('latest');

  const tabs: { id: FeedTab; label: string; icon: React.ElementType }[] = [
    { id: 'latest', label: 'Mới nhất', icon: ClockIcon },
    { id: 'trending', label: 'Nổi bật', icon: FireIcon },
    { id: 'following', label: 'Đang theo dõi', icon: SparklesIcon },
  ];

  return (
    <PageLayout>
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Main Feed */}
          <section className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Cộng đồng</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Chia sẻ và thảo luận về crypto
                </p>
              </div>

              {isAuthenticated && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl 
                           bg-gradient-to-r from-emerald-500 to-cyan-500 
                           text-white font-medium shadow-lg shadow-emerald-500/20
                           hover:shadow-emerald-500/40 hover:scale-105 
                           active:scale-100 transition-all"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Đăng bài</span>
                </button>
              )}
            </div>

            {/* Create Post Modal */}
            {showCreateForm && (
              <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto">
                <div 
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setShowCreateForm(false)}
                />
                <div className="relative w-full max-w-2xl animate-slide-up">
                  <CreatePostForm 
                    onSuccess={() => setShowCreateForm(false)}
                    onCancel={() => setShowCreateForm(false)}
                  />
                </div>
              </div>
            )}

            {/* Feed Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 
                          overflow-x-auto scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFeedTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium 
                            whitespace-nowrap transition-all ${
                    feedTab === tab.id
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick actions for authenticated users */}
            {isAuthenticated && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/bookmarks')}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm
                           text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 
                           border border-white/10 transition-all"
                >
                  <BookmarkIcon className="w-4 h-4" />
                  Đã lưu
                </button>
              </div>
            )}

            {/* Post List */}
            <PostList 
              sortBy={feedTab === 'trending' ? 'trending' : 'latest'}
              showFollowingOnly={feedTab === 'following'}
            />
          </section>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <TrendingSection />

              {/* Quick Links */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4">Liên kết nhanh</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/community/trending')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                             text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <FireIcon className="w-5 h-5 text-orange-400" />
                    <span className="text-sm">Xem tất cả xu hướng</span>
                  </button>
                  {isAuthenticated && (
                    <>
                      <button
                        onClick={() => navigate('/bookmarks')}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <BookmarkIcon className="w-5 h-5 text-amber-400" />
                        <span className="text-sm">Bài viết đã lưu</span>
                      </button>
                      <button
                        onClick={() => navigate('/settings')}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <SparklesIcon className="w-5 h-5 text-purple-400" />
                        <span className="text-sm">Cài đặt thông báo</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </PageLayout>
  );
};

export default CommunityPage;
