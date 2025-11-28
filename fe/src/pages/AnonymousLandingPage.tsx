import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ChartBarIcon, 
  NewspaperIcon, 
  ChatBubbleLeftRightIcon,
  SignalIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import TopBar from '../components/layout/TopBar';
import Footer from '../components/layout/Footer';
import BackendStatus from '../components/common/BackendStatus';
import LoginModal from '../components/auth/LoginModal';
import HeroPattern from '../components/common/HeroPattern';
import { fetchMarketOverview } from '../api/market';
import { formatCurrency } from '../utils/format';

const AnonymousLandingPage = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { data: overview, isLoading } = useQuery({
    queryKey: ['market-overview'],
    queryFn: fetchMarketOverview,
    staleTime: 30_000, // Consider data fresh for 30 seconds
    refetchInterval: 120_000 // Refetch every 2 minutes
  });

  return (
    <div className="relative min-h-screen text-white overflow-hidden" style={{ background: 'radial-gradient(circle at top, rgba(52, 211, 153, 0.2), transparent), radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.25), transparent 45%), #020617' }}>
      <HeroPattern pattern="grid" opacity={0.15} />
      <TopBar />
      
      {/* Health Status Banner */}
      <div className="border-b border-white/10">
        <BackendStatus />
      </div>

      <main>
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-4 py-2 mb-6">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">100% Miễn phí • Không cần thẻ tín dụng</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Theo dõi thị trường Crypto
              <span className="block text-emerald-400 mt-2">Real-time & Miễn phí</span>
            </h1>
            
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
              Khám phá thị trường crypto với dữ liệu real-time từ Binance. 
              Đọc tin tức, tham gia cộng đồng và theo dõi các coin yêu thích.
            </p>

            {/* Market Stats */}
            {overview && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-400 mb-1">Tổng số coin</p>
                  <p className="text-2xl font-bold text-white">{overview.totalSymbols.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-400 mb-1">Tổng volume 24h</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(overview.totalVolume)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 col-span-2 md:col-span-1">
                  <p className="text-sm text-slate-400 mb-1">Tổng trades 24h</p>
                  <p className="text-2xl font-bold text-white">{overview.totalTrades.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* CTA Button */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => setShowLoginModal(true)}
                className="group relative rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-12 py-4 text-lg font-bold text-slate-900 shadow-2xl shadow-emerald-400/40 hover:shadow-emerald-400/60 transition-all hover:scale-105"
              >
                <span className="relative z-10">Get Started Free</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              
              <p className="text-sm text-slate-400">
                Start researching crypto like a pro • No credit card required
              </p>
              
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors underline decoration-cyan-400/30 hover:decoration-cyan-300"
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-white/10">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Tại sao chọn chúng tôi?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group rounded-xl border border-white/10 bg-slate-900/60 p-6 transition hover:border-emerald-400/50 hover:bg-slate-900/80">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 transition group-hover:bg-emerald-400/20">
                <ChartBarIcon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Dữ liệu Real-time</h3>
              <p className="text-slate-400">
                Cập nhật giá real-time từ Binance WebSocket. Theo dõi thị trường với độ trễ thấp nhất.
              </p>
            </div>
            
            <div className="group rounded-xl border border-white/10 bg-slate-900/60 p-6 transition hover:border-emerald-400/50 hover:bg-slate-900/80">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 transition group-hover:bg-emerald-400/20">
                <NewspaperIcon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Tin tức Crypto</h3>
              <p className="text-slate-400">
                Đọc tin tức crypto mới nhất từ các nguồn uy tín. Tìm kiếm và lọc theo category.
              </p>
            </div>
            
            <div className="group rounded-xl border border-white/10 bg-slate-900/60 p-6 transition hover:border-emerald-400/50 hover:bg-slate-900/80">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 transition group-hover:bg-emerald-400/20">
                <ChatBubbleLeftRightIcon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Cộng đồng</h3>
              <p className="text-slate-400">
                Tham gia thảo luận, chia sẻ ý kiến và học hỏi từ cộng đồng crypto.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-white/10">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Bắt đầu ngay</h2>
            <p className="text-slate-400 mb-8">
              Khám phá thị trường ngay bây giờ, không cần đăng ký
            </p>
            <a
              href="/dashboard"
              className="inline-block rounded-lg bg-emerald-400 px-8 py-3 text-lg font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition"
            >
              Xem Dashboard →
            </a>
          </div>
        </section>
      </main>

      <Footer />
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
};

export default AnonymousLandingPage;

