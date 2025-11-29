import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { getNotifications, Notification } from '../../api/notifications';
import { formatDistanceToNow } from 'date-fns';
import { navigate } from '../../utils/navigation';
import { BellIcon, MegaphoneIcon, ChatBubbleLeftRightIcon, HandThumbUpIcon, Cog6ToothIcon, BookmarkIcon } from '@heroicons/react/24/outline';

const NotificationsPanel = () => {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery<{
    notifications: Notification[];
    unreadCount: number;
  }>({
    queryKey: ['notifications', 'dashboard'],
    queryFn: () => getNotifications({ limit: 5, unreadOnly: false }),
    enabled: isAuthenticated,
    refetchInterval: 30_000
  });

  if (!isAuthenticated) {
    return null;
  }

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const getNotificationIcon = (type: Notification['type']) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'alert':
        return <BellIcon className={iconClass} />;
      case 'mention':
        return <MegaphoneIcon className={iconClass} />;
      case 'comment':
        return <ChatBubbleLeftRightIcon className={iconClass} />;
      case 'reaction':
        return <HandThumbUpIcon className={iconClass} />;
      case 'system':
        return <Cog6ToothIcon className={iconClass} />;
      default:
        return <BookmarkIcon className={iconClass} />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.data?.postId) {
      navigate(`/posts/${notification.data.postId}`);
    } else if (notification.data?.symbol) {
      navigate(`/coin/${notification.data.symbol}`);
    } else if (notification.type === 'alert') {
      navigate('/alerts');
    }
  };

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 shadow-2xl shadow-black/50">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Notifications</p>
          <h3 className="text-xl font-semibold text-white">Recent</h3>
        </div>
        {unreadCount > 0 && (
          <span className="rounded-full bg-emerald-400 px-2 py-1 text-xs font-bold text-slate-900">
            {unreadCount}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                notification.isRead
                  ? 'border-white/5 bg-white/5 hover:border-emerald-300/30'
                  : 'border-emerald-400/30 bg-emerald-400/10 hover:border-emerald-400/50'
              }`}
            >
              <span className="flex-shrink-0">{getNotificationIcon(notification.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{notification.title}</p>
                <p className="text-xs text-slate-400 line-clamp-2">{notification.message}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">No notifications</p>
      )}

      {notifications.length > 0 && (
        <a
          href="/notifications"
          className="mt-4 block text-center text-sm text-emerald-400 hover:text-emerald-300 transition"
        >
          View all →
        </a>
      )}
    </section>
  );
};

export default NotificationsPanel;

