import PageLayout from '../components/layout/PageLayout';
import WatchlistPanel from '../components/dashboard/WatchlistPanel';
import RecentActivityPanel from '../components/dashboard/RecentActivityPanel';

const DashboardPage = () => {
  return (
    <PageLayout pattern="dots" patternOpacity={0.1} showBackendStatus={false}>
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8">
            <h2 className="text-xl font-bold text-white mb-2">📊 Market Data</h2>
            <p className="text-slate-400">Market data temporarily disabled for development.</p>
          </div>
        </section>
        <aside className="space-y-6">
          <WatchlistPanel />
          <RecentActivityPanel />
        </aside>
      </main>
    </PageLayout>
  );
};

export default DashboardPage;
