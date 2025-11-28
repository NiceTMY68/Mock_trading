import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Popover, Transition } from '@headlessui/react';
import { 
  BellIcon, 
  XMarkIcon, 
  CheckIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleLeftIcon,
  HandThumbUpIcon,
  Cog6ToothIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/auth';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, Notification } from '../../api/notifications';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = () => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({ limit: 20, unreadOnly: false }),
    enabled: isAuthenticated,
    refetchInterval: 30_000 // Refetch every 30 seconds
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

  if (!isAuthenticated) {
    return null;
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

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

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900">
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white ring-2 ring-slate-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Popover.Button>

          <Transition
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsReadMutation.mutate()}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
                    >
                      <CheckIcon className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                  <Popover.Button className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition">
                    <XMarkIcon className="w-4 h-4" />
                  </Popover.Button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <BellIcon className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                    <p className="text-slate-400 text-sm">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 cursor-pointer transition ${
                          notification.isRead
                            ? 'bg-transparent hover:bg-white/5'
                            : 'bg-emerald-400/5 hover:bg-emerald-400/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className={`text-sm font-semibold ${notification.isRead ? 'text-slate-300' : 'text-white'}`}>
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1"></span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2 mb-2">{notification.message}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotificationMutation.mutate(notification.id);
                                }}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition"
                              >
                                <XMarkIcon className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="border-t border-white/10 p-3 text-center">
                  <a
                    href="/notifications"
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition"
                    onClick={() => close()}
                  >
                    View all notifications →
                  </a>
                </div>
              )}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default NotificationBell;

