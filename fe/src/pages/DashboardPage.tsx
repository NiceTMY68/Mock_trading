import { useQuery } from '@tanstack/react-query';
import PageLayout from '../components/layout/PageLayout';
import OverviewCards from '../components/dashboard/OverviewCards';
import MarketHighlights from '../components/dashboard/MarketHighlights';
import PriceChartPanel from '../components/dashboard/PriceChartPanel';
import WatchlistPanel from '../components/dashboard/WatchlistPanel';
import PortfolioPanel from '../components/dashboard/PortfolioPanel';
import MarketTable from '../components/dashboard/MarketTable';
import RecentActivityPanel from '../components/dashboard/RecentActivityPanel';
import NotificationsPanel from '../components/dashboard/NotificationsPanel';
import PortfolioHistoricChart from '../components/dashboard/PortfolioHistoricChart';
import WebSocketSubscriptionManager from '../components/dashboard/WebSocketSubscriptionManager';
import { fetchMarketOverview } from '../api/market';

const DashboardPage = () => {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['market-overview'],
    queryFn: fetchMarketOverview,
    staleTime: 30_000,
    refetchInterval: 120_000
  });

  return (
    <PageLayout pattern="dots" patternOpacity={0.1} showBackendStatus={false}>
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <OverviewCards data={overview} isLoading={isLoading} />
          <MarketHighlights />
          <MarketTable />
        </section>
        <aside className="space-y-6">
          <PriceChartPanel />
          <WatchlistPanel />
          <WebSocketSubscriptionManager />
          <PortfolioPanel />
          <PortfolioHistoricChart />
          <NotificationsPanel />
          <RecentActivityPanel />
        </aside>
      </main>
    </PageLayout>
  );
};

export default DashboardPage;

