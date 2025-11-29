/**
 * SettingsPage
 * 
 * Trang cài đặt tài khoản với Notification Settings
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BellIcon, 
  EnvelopeIcon, 
  DevicePhoneMobileIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  NoSymbolIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import PageLayout from '../components/layout/PageLayout';
import { 
  getNotificationSettings, 
  updateNotificationSettings, 
  resetNotificationSettings,
  NotificationSettings 
} from '../api/settings';
import { getBlockedUsers } from '../api/blocks';
import { navigate } from '../utils/navigation';

type SettingsTab = 'notifications' | 'blocked' | 'privacy';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications');
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: getNotificationSettings,
  });

  const { data: blockedUsers } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: () => getBlockedUsers(0, 100),
  });

  const updateMutation = useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: (newSettings) => {
      queryClient.setQueryData(['notification-settings'], newSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  });

  const resetMutation = useMutation({
    mutationFn: resetNotificationSettings,
    onSuccess: (newSettings) => {
      queryClient.setQueryData(['notification-settings'], newSettings);
    }
  });

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  const tabs = [
    { id: 'notifications' as const, label: 'Thông báo', icon: BellIcon },
    { id: 'blocked' as const, label: 'Đã chặn', icon: NoSymbolIcon },
    { id: 'privacy' as const, label: 'Bảo mật', icon: ShieldCheckIcon },
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
              <h1 className="text-2xl font-bold text-white">Cài đặt</h1>
              <p className="text-slate-400 text-sm">Quản lý tài khoản của bạn</p>
            </div>
          </div>

          {/* Save indicator */}
          {saved && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 
                          border border-emerald-500/30 text-emerald-400 animate-fade-in">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Đã lưu</span>
            </div>
          )}
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
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div>
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Email Notifications */}
                    <div className="p-6 border-b border-white/10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <EnvelopeIcon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">Email</h3>
                          <p className="text-sm text-slate-400">Nhận thông báo qua email</p>
                        </div>
                        <ToggleSwitch
                          enabled={settings?.emailEnabled ?? true}
                          onChange={(v) => handleToggle('emailEnabled', v)}
                        />
                      </div>

                      <div className={`space-y-3 ${!settings?.emailEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        {[
                          { key: 'emailNewFollower', label: 'Người theo dõi mới' },
                          { key: 'emailNewComment', label: 'Bình luận mới' },
                          { key: 'emailNewReaction', label: 'Lượt thích mới' },
                          { key: 'emailNewPostFromFollowing', label: 'Bài viết từ người theo dõi' },
                          { key: 'emailMentions', label: 'Được nhắc đến' },
                          { key: 'emailAnnouncements', label: 'Thông báo hệ thống' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between py-2 px-4 
                                                        rounded-xl hover:bg-white/5">
                            <span className="text-sm text-slate-300">{item.label}</span>
                            <ToggleSwitch
                              enabled={settings?.[item.key as keyof NotificationSettings] as boolean ?? true}
                              onChange={(v) => handleToggle(item.key as keyof NotificationSettings, v)}
                              disabled={!settings?.emailEnabled}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Push Notifications */}
                    <div className="p-6 border-b border-white/10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                          <DevicePhoneMobileIcon className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">Thông báo đẩy</h3>
                          <p className="text-sm text-slate-400">Nhận thông báo trong ứng dụng</p>
                        </div>
                        <ToggleSwitch
                          enabled={settings?.pushEnabled ?? true}
                          onChange={(v) => handleToggle('pushEnabled', v)}
                        />
                      </div>

                      <div className={`space-y-3 ${!settings?.pushEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        {[
                          { key: 'pushNewFollower', label: 'Người theo dõi mới' },
                          { key: 'pushNewComment', label: 'Bình luận mới' },
                          { key: 'pushNewReaction', label: 'Lượt thích mới' },
                          { key: 'pushNewPostFromFollowing', label: 'Bài viết từ người theo dõi' },
                          { key: 'pushMentions', label: 'Được nhắc đến' },
                          { key: 'pushPriceAlerts', label: 'Cảnh báo giá' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between py-2 px-4 
                                                        rounded-xl hover:bg-white/5">
                            <span className="text-sm text-slate-300">{item.label}</span>
                            <ToggleSwitch
                              enabled={settings?.[item.key as keyof NotificationSettings] as boolean ?? true}
                              onChange={(v) => handleToggle(item.key as keyof NotificationSettings, v)}
                              disabled={!settings?.pushEnabled}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quiet Hours */}
                    <div className="p-6 border-b border-white/10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <ClockIcon className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">Giờ yên tĩnh</h3>
                          <p className="text-sm text-slate-400">Tạm dừng thông báo trong khoảng thời gian</p>
                        </div>
                        <ToggleSwitch
                          enabled={settings?.quietHoursEnabled ?? false}
                          onChange={(v) => handleToggle('quietHoursEnabled', v)}
                        />
                      </div>

                      {settings?.quietHoursEnabled && (
                        <div className="flex items-center gap-4 px-4">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Từ</label>
                            <input
                              type="time"
                              value={settings.quietHoursStart || '22:00'}
                              onChange={(e) => updateMutation.mutate({ quietHoursStart: e.target.value })}
                              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 
                                       text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Đến</label>
                            <input
                              type="time"
                              value={settings.quietHoursEnd || '07:00'}
                              onChange={(e) => updateMutation.mutate({ quietHoursEnd: e.target.value })}
                              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 
                                       text-white text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reset */}
                    <div className="p-6">
                      <button
                        onClick={() => {
                          if (confirm('Đặt lại tất cả cài đặt về mặc định?')) {
                            resetMutation.mutate();
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 
                                 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <ArrowPathIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">Đặt lại mặc định</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Blocked Users Tab */}
            {activeTab === 'blocked' && (
              <div className="p-6">
                <h3 className="font-semibold text-white mb-4">Người dùng đã chặn</h3>
                
                {!blockedUsers?.users.length ? (
                  <div className="text-center py-12">
                    <NoSymbolIcon className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                    <p className="text-slate-400">Bạn chưa chặn ai</p>
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
                            Đã chặn {new Date(user.blockedAt).toLocaleDateString('vi-VN')}
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
                <h3 className="font-semibold text-white mb-4">Bảo mật & Quyền riêng tư</h3>
                <p className="text-slate-400 text-sm">
                  Tính năng đang được phát triển...
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </PageLayout>
  );
};

export default SettingsPage;

