import { useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import AlertList from '../components/alerts/AlertList';
import AlertHistory from '../components/alerts/AlertHistory';

const AlertsPage = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  return (
    <PageLayout>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'active'
                ? 'border-b-2 border-emerald-400 text-emerald-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Alerts
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'history'
                ? 'border-b-2 border-emerald-400 text-emerald-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            History
          </button>
        </div>

        {activeTab === 'active' ? <AlertList /> : <AlertHistory />}
      </main>
    </PageLayout>
  );
};

export default AlertsPage;

