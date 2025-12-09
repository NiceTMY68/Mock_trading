import { useState, useEffect } from 'react';
import { useAuthStore } from './store/auth';
import LoginModal from './components/auth/LoginModal';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminPosts from './pages/AdminPosts';
import AdminSecurity from './pages/AdminSecurity';
import AdminAnnouncements from './pages/AdminAnnouncements';

type Page = 'dashboard' | 'users' | 'posts' | 'security' | 'announcements';

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && user.role !== 'admin') {
      alert('Access denied. Admin privileges required.');
      useAuthStore.getState().clearAuth();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated) setShowLoginModal(true);
  }, [isAuthenticated]);

  useEffect(() => {
    const path = window.location.pathname.slice(1) as Page;
    if (path && ['dashboard', 'users', 'posts', 'security', 'announcements'].includes(path)) {
      setCurrentPage(path);
    }
  }, []);

  const navigate = (page: Page) => {
    setCurrentPage(page);
    window.history.pushState({}, '', `/${page}`);
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <LoginModal 
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)} 
          initialMode="login" 
        />
      </div>
    );
  }

  return (
    <AdminLayout currentPage={currentPage} onNavigate={navigate}>
      {currentPage === 'dashboard' && <AdminDashboard />}
      {currentPage === 'users' && <AdminUsers />}
      {currentPage === 'posts' && <AdminPosts />}
      {currentPage === 'security' && <AdminSecurity />}
      {currentPage === 'announcements' && <AdminAnnouncements />}
    </AdminLayout>
  );
}

export default App;

