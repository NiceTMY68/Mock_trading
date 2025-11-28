import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import PageLayout from '../components/layout/PageLayout';
import Link from '../components/common/Link';
import { navigate } from '../utils/navigation';
import { getMe, updateProfile, changePassword, exportUserData, deleteAccount, UpdateProfileRequest, ChangePasswordRequest } from '../api/auth';
import { format } from 'date-fns';

const ProfilePage = () => {
  const { user: authUser, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'security'>('profile');

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: getMe,
    enabled: !!authUser
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword
  });

  const exportDataMutation = useMutation({
    mutationFn: exportUserData,
    onSuccess: (data) => {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert('Data exported successfully!');
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      useAuthStore.getState().clearAuth();
      navigate('/');
    }
  });

  if (!authUser) {
    return (
      <PageLayout>
        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-12 text-center">
            <p className="text-slate-400 mb-4">Please login to view your profile</p>
            <Link href="/" className="text-emerald-400 hover:text-emerald-300 underline">
              Login
            </Link>
          </div>
        </main>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-white/10">
          {(['profile', 'settings', 'security'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? 'border-b-2 border-emerald-400 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-8 animate-pulse">
            <div className="h-8 bg-white/10 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-white/10 rounded w-2/3"></div>
          </div>
        ) : (
          <>
            {activeTab === 'profile' && <ProfileTab user={user!} updateProfileMutation={updateProfileMutation} />}
            {activeTab === 'settings' && <SettingsTab />}
            {activeTab === 'security' && <SecurityTab 
              changePasswordMutation={changePasswordMutation}
              exportDataMutation={exportDataMutation}
              deleteAccountMutation={deleteAccountMutation}
            />}
          </>
        )}
      </main>
    </PageLayout>
  );
};

// Profile Tab Component
const ProfileTab = ({ user, updateProfileMutation }: { user: any; updateProfileMutation: any }) => {
  const [formData, setFormData] = useState<UpdateProfileRequest>({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    avatarUrl: user?.avatarUrl || '',
    socialLinks: user?.socialLinks || {}
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Avatar URL</label>
          <div className="flex items-center gap-4">
            {formData.avatarUrl && (
              <img
                src={formData.avatarUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-emerald-400/30"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <input
              type="url"
              value={formData.avatarUrl || ''}
              onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
              placeholder="https://example.com/avatar.jpg"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Display Name</label>
          <input
            type="text"
            value={formData.displayName || ''}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            placeholder="Your display name"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            required
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Bio</label>
          <textarea
            value={formData.bio || ''}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell us about yourself..."
            rows={4}
            maxLength={500}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none resize-none"
          />
          <p className="text-xs text-slate-500 mt-1">{(formData.bio || '').length}/500</p>
        </div>

        {/* Social Links */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Social Links</label>
          <div className="space-y-3">
            <input
              type="url"
              value={formData.socialLinks?.twitter || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  socialLinks: { ...formData.socialLinks, twitter: e.target.value }
                })
              }
              placeholder="Twitter URL"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            />
            <input
              type="url"
              value={formData.socialLinks?.github || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  socialLinks: { ...formData.socialLinks, github: e.target.value }
                })
              }
              placeholder="GitHub URL"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            />
            <input
              type="url"
              value={formData.socialLinks?.website || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  socialLinks: { ...formData.socialLinks, website: e.target.value }
                })
              }
              placeholder="Website URL"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Stats */}
        {user?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-white/5">
            <div>
              <p className="text-xs text-slate-400 mb-1">Posts</p>
              <p className="text-lg font-semibold text-white">{user.stats.postsCount || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Comments</p>
              <p className="text-lg font-semibold text-white">{user.stats.commentsCount || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Watchlists</p>
              <p className="text-lg font-semibold text-white">{user.stats.watchlistsCount || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Active Alerts</p>
              <p className="text-lg font-semibold text-white">{user.stats.alertsCount || 0}</p>
            </div>
          </div>
        )}

        {/* Account Info */}
        <div className="p-4 rounded-lg bg-white/5">
          <p className="text-xs text-slate-400 mb-2">Account Information</p>
          <p className="text-sm text-slate-300">Email: {user?.email}</p>
          <p className="text-sm text-slate-300">Member since: {user?.createdAt ? format(new Date(user.createdAt), 'MMMM d, yyyy') : 'N/A'}</p>
          {user?.lastLogin && (
            <p className="text-sm text-slate-300">Last login: {format(new Date(user.lastLogin), 'MMMM d, yyyy HH:mm')}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={updateProfileMutation.isPending}
          className="w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>

        {updateProfileMutation.isSuccess && (
          <p className="text-sm text-emerald-400 text-center">Profile updated successfully!</p>
        )}
        {updateProfileMutation.isError && (
          <p className="text-sm text-rose-400 text-center">Failed to update profile. Please try again.</p>
        )}
      </form>
    </div>
  );
};

// Settings Tab Component
const SettingsTab = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    priceAlerts: true,
    communityUpdates: true,
    marketingEmails: false
  });

  const handleSave = () => {
    // TODO: Implement settings save API
    alert('Settings saved! (This feature will be implemented with backend API)');
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Notification Settings</h2>

      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
            <div>
              <p className="text-sm font-medium text-white">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}</p>
              <p className="text-xs text-slate-400">Receive notifications for {key.toLowerCase().replace(/([A-Z])/g, ' $1')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-400"></div>
            </label>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="mt-6 w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition"
      >
        Save Settings
      </button>
    </div>
  );
};

// Security Tab Component
const SecurityTab = ({ 
  changePasswordMutation, 
  exportDataMutation, 
  deleteAccountMutation 
}: { 
  changePasswordMutation: any;
  exportDataMutation: any;
  deleteAccountMutation: any;
}) => {
  const [formData, setFormData] = useState<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    changePasswordMutation.mutate(formData, {
      onSuccess: () => {
        setFormData({ currentPassword: '', newPassword: '' });
        setConfirmPassword('');
      }
    });
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Change Password</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
          <input
            type="password"
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            placeholder="Enter current password"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
          <input
            type="password"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            placeholder="Enter new password (min 8 characters)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            required
          />
          {confirmPassword && formData.newPassword !== confirmPassword && (
            <p className="text-xs text-rose-400 mt-1">Passwords do not match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={changePasswordMutation.isPending || formData.newPassword !== confirmPassword}
          className="w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
        </button>

        {changePasswordMutation.isSuccess && (
          <p className="text-sm text-emerald-400 text-center">Password changed successfully!</p>
        )}
        {changePasswordMutation.isError && (
          <p className="text-sm text-rose-400 text-center">
            {changePasswordMutation.error?.response?.data?.message || 'Failed to change password. Please try again.'}
          </p>
        )}
      </form>

      {/* Data Export */}
      <div className="mt-8 pt-8 border-t border-white/5">
        <h3 className="text-lg font-semibold text-white mb-4">Data Export</h3>
        <p className="text-sm text-slate-400 mb-4">
          Download all your data in JSON format. This includes your posts, comments, watchlists, alerts, and more.
        </p>
        <button
          onClick={() => exportDataMutation.mutate()}
          disabled={exportDataMutation.isPending}
          className="rounded-lg bg-blue-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-blue-400/30 hover:bg-blue-300 transition disabled:opacity-50"
        >
          {exportDataMutation.isPending ? 'Exporting...' : '📥 Export My Data'}
        </button>
      </div>

      {/* Delete Account */}
      <div className="mt-8 pt-8 border-t border-rose-500/20">
        <h3 className="text-lg font-semibold text-rose-400 mb-4">Danger Zone</h3>
        <p className="text-sm text-slate-400 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-300 hover:bg-rose-400/20 transition"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password to confirm"
              className="w-full rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-white placeholder-slate-500 focus:border-rose-400 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (deletePassword) {
                    deleteAccountMutation.mutate({ password: deletePassword });
                  } else {
                    alert('Please enter your password');
                  }
                }}
                disabled={deleteAccountMutation.isPending || !deletePassword}
                className="rounded-lg bg-rose-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-400/30 hover:bg-rose-500 transition disabled:opacity-50"
              >
                {deleteAccountMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:border-white/20 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;

