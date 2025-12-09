import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  UserCircleIcon,
  ShieldCheckIcon,
  NoSymbolIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import PageLayout from '../components/layout/PageLayout';
import { getBlockedUsers } from '../api/blocks';
import { navigate } from '../utils/navigation';

type SettingsTab = 'blocked' | 'privacy';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('blocked');

  const { data: blockedUsers } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: () => getBlockedUsers(0, 100),
  });

  const tabs = [
    { id: 'blocked' as const, label: 'Blocked', icon: NoSymbolIcon },
    { id: 'privacy' as const, label: 'Privacy', icon: ShieldCheckIcon },
  ];

  const ToggleSwitch = ({ 
    enabled, 
    onChange, 
    disabled = false 
  }: { 
    enabled: boolean; 
    onChange: (v: boolean) => void; 
    disabled?: boolean 
  }) => (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`
        relative w-12 h-7 rounded-full transition-all duration-300
        ${enabled ? 'bg-emerald-500' : 'bg-white/10'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span 
        className={`
          absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg
          transition-transform duration-300
          ${enabled ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );

  return (
    <PageLayout>
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 
                          flex items-center justify-center shadow-lg shadow-violet-500/20">
              <UserCircleIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-slate-400 text-sm">Manage your account</p>
            </div>
          </div>

        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar */}
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                {tab.id === 'blocked' && blockedUsers && blockedUsers.users.length > 0 && (
                  <span className="ml-auto text-xs bg-white/10 px-2 py-0.5 rounded-full">
                    {blockedUsers.users.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Content */}
          <section className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {/* Blocked Users Tab */}
            {activeTab === 'blocked' && (
              <div className="p-6">
                <h3 className="font-semibold text-white mb-4">Blocked Users</h3>
                
                {!blockedUsers?.users.length ? (
                  <div className="text-center py-12">
                    <NoSymbolIcon className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                    <p className="text-slate-400">You haven't blocked anyone</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockedUsers.users.map((user) => (
                      <div 
                        key={user.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/[0.07]"
                      >
                        <img
                          src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`}
                          alt=""
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-white">{user.displayName}</p>
                          <p className="text-sm text-slate-500">
                            Blocked on {new Date(user.blockedAt).toLocaleDateString('en-US')}
                          </p>
                        </div>
                        <button
                          onClick={() => navigate(`/profile/${user.id}`)}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-400"
                        >
                          <ChevronRightIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="p-6">
                <h3 className="font-semibold text-white mb-4">Security & Privacy</h3>
                <p className="text-slate-400 text-sm">
                  Feature under development...
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

    </PageLayout>
  );
};

export default SettingsPage;

