import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { getAllUsers, updateUser, deleteUser, forceLogoutUser, AdminUser } from '../api/admin';
import { format } from 'date-fns';

const AdminUsersPage = () => {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter, activeFilter],
    queryFn: () =>
      getAllUsers({
        page,
        size: 20,
        search: search || undefined,
        role: roleFilter || undefined,
        isActive: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined
      }),
    enabled: currentUser?.role === 'admin'
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: any }) => updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    }
  });

  const forceLogoutMutation = useMutation({
    mutationFn: forceLogoutUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      alert('User logged out from all devices');
    }
  });

  const handleToggleActive = (user: AdminUser) => {
    updateUserMutation.mutate({
      userId: user.id,
      data: { isActive: !user.isActive }
    });
  };

  const handleChangeRole = (user: AdminUser, newRole: 'user' | 'admin') => {
    if (confirm(`Change ${user.displayName}'s role to ${newRole}?`)) {
      updateUserMutation.mutate({
        userId: user.id,
        data: { role: newRole }
      });
    }
  };

  const handleDelete = (user: AdminUser) => {
    if (confirm(`Delete user ${user.displayName}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen text-white flex items-center justify-center" style={{ background: 'radial-gradient(circle at top, rgba(52, 211, 153, 0.2), transparent), radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.25), transparent 45%), #020617' }}>
        <div className="text-center">
          <p className="text-rose-400 text-xl mb-4">Access Denied</p>
          <a href="/" className="text-emerald-400 hover:text-emerald-300 underline">← Back to Dashboard</a>
        </div>
      </div>
    );
  }

  const users = data?.users || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
            <p className="text-slate-400">Manage users, roles, and permissions</p>
          </div>
          <a
            href="/admin"
            className="text-sm text-slate-400 hover:text-emerald-400 transition"
          >
            ← Back to Admin Dashboard
          </a>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by email or name..."
            className="flex-1 min-w-64 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Stats</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-12 animate-pulse rounded bg-white/5" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.displayName} className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-400 flex items-center justify-center text-sm font-bold text-slate-900">
                              {user.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-white">{user.displayName}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user, e.target.value as 'user' | 'admin')}
                          disabled={user.id === currentUser?.id}
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white focus:border-emerald-400 focus:outline-none disabled:opacity-50"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-300">
                        <p>{user.stats.postsCount} posts</p>
                        <p>{user.stats.commentsCount} comments</p>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={user.id === currentUser?.id}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                            user.isActive
                              ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                              : 'bg-rose-400/20 text-rose-300 border border-rose-400/30'
                          } disabled:opacity-50`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-400">
                        {format(new Date(user.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <a
                            href={`/users/${user.id}`}
                            className="text-xs text-emerald-400 hover:text-emerald-300"
                          >
                            View
                          </a>
                          <button
                            onClick={() => {
                              if (confirm(`Force logout user ${user.displayName}? This will revoke all their refresh tokens.`)) {
                                forceLogoutMutation.mutate(user.id);
                              }
                            }}
                            disabled={user.id === currentUser?.id}
                            className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50"
                            title="Force logout from all devices"
                          >
                            Logout
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={user.id === currentUser?.id}
                            className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-emerald-300 transition disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-400">
              Page {page + 1} of {pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= pagination.pages}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:border-emerald-300 transition disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
    </div>
  );
};

export default AdminUsersPage;

