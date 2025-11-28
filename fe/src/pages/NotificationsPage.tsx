import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import PageLayout from '../components/layout/PageLayout';
import Link from '../components/common/Link';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, Notification } from '../api/notifications';
import { formatDistanceToNow } from 'date-fns';

const NotificationsPage = () => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () =>
      getNotifications({
        limit: 50,
        unreadOnly: filter === 'unread',
        type: null
      }),
    enabled: isAuthenticated,
    refetchInterval: 30_000
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const getNotificationIcon = (type: Notification['type']) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'alert':
        return <BellIcon className={iconClass} />;
      case 'mention':
        return <ChatBubbleLeftRightIcon className={iconClass} />;
      case 'comment':
        return <ChatBubbleLeftIcon className={iconClass} />;
      case 'reaction':
        return <HandThumbUpIcon className={iconClass} />;
      case 'system':
        return <Cog6ToothIcon className={iconClass} />;
      default:
        return <MegaphoneIcon className={iconClass} />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'alert':
        return 'text-emerald-400';
      case 'mention':
        return 'text-blue-400';
      case 'comment':
        return 'text-cyan-400';
      case 'reaction':
        return 'text-yellow-400';
      case 'system':
        return 'text-slate-400';
      default:
        return 'text-white';
    }
  };

  if (!isAuthenticated) {
    return (
      <PageLayout>
        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-12 text-center">
            <p className="text-slate-400 mb-4">Please login to view notifications</p>
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
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
              <p className="text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(['all', 'unread', 'read'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition ${
                  filter === f
                    ? 'bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/30'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
                <div className="h-4 bg-white/10 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-12 text-center">
            <p className="text-slate-400 mb-2">No notifications</p>
            <p className="text-sm text-slate-500">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl border p-4 transition ${
                  notification.isRead
                    ? 'border-white/5 bg-slate-900/60'
                    : 'border-emerald-400/30 bg-emerald-400/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className={`text-base font-semibold ${notification.isRead ? 'text-slate-300' : 'text-white'}`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 transition"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{notification.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                      <button
                        onClick={() => deleteNotificationMutation.mutate(notification.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </PageLayout>
  );
};

export default NotificationsPage;

