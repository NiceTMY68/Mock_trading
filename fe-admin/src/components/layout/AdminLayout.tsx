import { ReactNode } from 'react';
import {
  HomeIcon,
  UsersIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  MegaphoneIcon,
  ArrowRightOnRectangleIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/auth';

type Page = 'dashboard' | 'users' | 'posts' | 'security' | 'announcements';

interface AdminLayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const AdminLayout = ({ children, currentPage, onNavigate }: AdminLayoutProps) => {
  const { user, clearAuth } = useAuthStore();

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: HomeIcon },
    { id: 'users', name: 'Users', icon: UsersIcon },
    { id: 'posts', name: 'Posts', icon: DocumentTextIcon },
    { id: 'security', name: 'Security', icon: ShieldExclamationIcon },
    { id: 'announcements', name: 'Announcements', icon: MegaphoneIcon },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-purple-500/20 bg-slate-950/50 backdrop-blur-xl">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 border-b border-purple-500/20 p-6">
            <div className="relative">
              <BeakerIcon className="w-8 h-8 text-purple-400" />
              <div className="absolute inset-0 blur-xl bg-purple-400/30 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                CoinLab
              </h1>
              <p className="text-xs text-purple-300/70 font-medium tracking-wider">ADMIN PANEL</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id as Page)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/20 border border-purple-400/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* User & Logout */}
          <div className="border-t border-purple-500/20 p-4 space-y-2">
            <div className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-400 text-sm font-bold text-slate-900">
                {user?.displayName?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-300 truncate">{user?.displayName}</p>
                <p className="text-xs text-purple-400 uppercase tracking-wider">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={clearAuth}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

