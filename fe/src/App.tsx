import { useEffect, useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import CommunityPage from './pages/CommunityPage';
import PostDetailPage from './pages/PostDetailPage';
import AlertsPage from './pages/AlertsPage';
import CoinDetailPage from './pages/CoinDetailPage';
import NewsPage from './pages/NewsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import AnonymousLandingPage from './pages/AnonymousLandingPage';
import BookmarksPage from './pages/BookmarksPage';
import HashtagPage from './pages/HashtagPage';
import SettingsPage from './pages/SettingsPage';
import TrendingPage from './pages/TrendingPage';
import BackendStatus from './components/common/BackendStatus';
import SearchModal from './components/search/SearchModal';
import { useAuthStore } from './store/auth';

function App() {
  const { isAuthenticated } = useAuthStore();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showSearchModal, setShowSearchModal] = useState(false);

  const getPageFromPath = (path: string) => {
    if (path.startsWith('/community/post/')) return 'post-detail';
    if (path.startsWith('/community/hashtag/')) return 'hashtag';
    if (path.startsWith('/community/trending')) return 'trending';
    if (path.startsWith('/community')) return 'community';
    if (path.startsWith('/posts/')) return 'post-detail';
    if (path.startsWith('/coin/') || path.startsWith('/coins/')) return 'coin-detail';
    if (path.startsWith('/alerts')) return 'alerts';
    if (path.startsWith('/news')) return 'news';
    if (path.startsWith('/notifications')) return 'notifications';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/bookmarks')) return 'bookmarks';
    if (path.startsWith('/settings')) return 'settings';
    if (path === '/' && !isAuthenticated) return 'landing';
    return 'dashboard';
  };

  useEffect(() => {
    const updatePage = () => setCurrentPage(getPageFromPath(window.location.pathname));
    updatePage();
    window.addEventListener('popstate', updatePage);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('popstate', updatePage);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAuthenticated]);

  return (
    <>
      {currentPage === 'landing' && <AnonymousLandingPage />}
      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'community' && <CommunityPage />}
      {currentPage === 'post-detail' && <PostDetailPage />}
      {currentPage === 'alerts' && <AlertsPage />}
      {currentPage === 'coin-detail' && <CoinDetailPage />}
      {currentPage === 'news' && <NewsPage />}
      {currentPage === 'notifications' && <NotificationsPage />}
      {currentPage === 'profile' && <ProfilePage />}
      {currentPage === 'search' && <SearchPage />}
      {currentPage === 'bookmarks' && <BookmarksPage />}
      {currentPage === 'hashtag' && <HashtagPage />}
      {currentPage === 'settings' && <SettingsPage />}
      {currentPage === 'trending' && <TrendingPage />}
      {currentPage !== 'landing' && <BackendStatus />}
      {currentPage !== 'landing' && (
        <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
      )}
    </>
  );
}

export default App;
