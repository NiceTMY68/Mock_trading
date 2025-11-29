import { useMemo, Fragment, useState, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { 
  HomeIcon, 
  NewspaperIcon, 
  BellIcon, 
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  SignalIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';
import { useWatchlistStore } from '../../store/watchlist';
import { useAuthStore } from '../../store/auth';
import NotificationBell from '../notifications/NotificationBell';
import SearchModal from '../search/SearchModal';
import CoinLabLogo from '../common/CoinLabLogo';
import Link from '../common/Link';
import { isActivePath } from '../../utils/navigation';

const TopBar = () => {
  const selectedSymbol = useWatchlistStore((state) => state.selectedSymbol);
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  // Track route changes
  useEffect(() => {
    const updatePath = () => setCurrentPath(window.location.pathname);
    
    // Listen for browser back/forward buttons
    window.addEventListener('popstate', updatePath);
    
    // Poll for path changes (for client-side routing)
    const interval = setInterval(() => {
      if (window.location.pathname !== currentPath) {
        updatePath();
      }
    }, 100);
    
    return () => {
      window.removeEventListener('popstate', updatePath);
      clearInterval(interval);
    };
  }, [currentPath]);
  
  // Check if we're on a coin detail page
  const isOnCoinDetailPage = currentPath.startsWith('/coin/') || currentPath.startsWith('/coins/');
  
  const title = useMemo(() => {
    if (!selectedSymbol) return 'Market Research Terminal';
    return `Analysis • ${selectedSymbol}`;
  }, [selectedSymbol]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl shadow-lg shadow-cyan-500/5">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <CoinLabLogo size="md" showText={true} />
          {selectedSymbol && isOnCoinDetailPage && (
            <div className="hidden md:block pl-4 border-l border-white/10">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-medium">{title}</p>
            </div>
          )}
        </Link>

        <div className="flex items-center gap-3 flex-1">
          {/* Search Trigger Button */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="hidden md:flex items-center gap-2 flex-1 max-w-md rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 hover:border-cyan-400/50 hover:bg-white/10 hover:text-slate-300 transition-all group"
          >
            <MagnifyingGlassIcon className="w-4 h-4 group-hover:text-cyan-400 transition" />
            <span>Search...</span>
            <kbd className="ml-auto hidden lg:inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs text-slate-500">
              <span>⌘</span>K
            </kbd>
          </button>
          
          <nav className="hidden items-center gap-2 lg:flex">
            <Link
              href="/"
              exact
              activeClassName="border-cyan-400/50 bg-cyan-500/10 text-cyan-300"
              className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              <HomeIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Dashboard
            </Link>
            <Link
              href="/news"
              activeClassName="border-cyan-400/50 bg-cyan-500/10 text-cyan-300"
              className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              <NewspaperIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              News
            </Link>
            <Link
              href="/alerts"
              activeClassName="border-emerald-400/50 bg-emerald-500/10 text-emerald-300"
              className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            >
              <BellIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Alerts
            </Link>
            <Link
              href="/community"
              activeClassName="border-purple-400/50 bg-purple-500/10 text-purple-300"
              className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Community
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {/* Mobile Search */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:border-cyan-400/50 hover:bg-white/10 hover:text-cyan-400 transition-all"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
            
            <NotificationBell />
            {isAuthenticated && user && (
              <>
                <Menu as="div" className="relative">
                  <Menu.Button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:border-emerald-400 hover:bg-emerald-500/20 transition focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.displayName} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center text-xs font-bold text-slate-900">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="hidden md:inline">{user.displayName}</span>
                    <UserCircleIcon className="w-4 h-4 hidden sm:block" />
                  </Menu.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl focus:outline-none">
                      <div className="p-1">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              href="/profile"
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                                active ? 'bg-white/10 text-white' : 'text-slate-300'
                              }`}
                            >
                              <UserCircleIcon className="w-4 h-4" />
                              Profile
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              href="/bookmarks"
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                                active ? 'bg-white/10 text-white' : 'text-slate-300'
                              }`}
                            >
                              <BookmarkIcon className="w-4 h-4" />
                              Đã lưu
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              href="/settings"
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                                active ? 'bg-white/10 text-white' : 'text-slate-300'
                              }`}
                            >
                              <Cog6ToothIcon className="w-4 h-4" />
                              Cài đặt
                            </Link>
                          )}
                        </Menu.Item>
                        <div className="my-1 border-t border-white/10" />
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={clearAuth}
                              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                                active ? 'bg-rose-500/20 text-rose-300' : 'text-slate-300'
                              }`}
                            >
                              <ArrowRightOnRectangleIcon className="w-4 h-4" />
                              Logout
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </>
            )}
            <div className="hidden items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-300 md:flex shadow-lg shadow-emerald-500/10">
              <SignalIcon className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
              <span className="font-medium">Live Feed</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search Modal */}
      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </header>
  );
};

export default TopBar;

