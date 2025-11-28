import apiClient from './client';

export interface Notification {
  id: number;
  type: 'alert' | 'mention' | 'comment' | 'reaction' | 'system';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface GetNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  type?: string;
}

/**
 * Get notifications for current user
 */
export const getNotifications = async (options: GetNotificationsOptions = {}): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> => {
  const response = await apiClient.get('/notifications', { params: options });
  return response.data.data;
};

/**
 * Mark notification as read
 */
export const markAsRead = async (id: number): Promise<void> => {
  await apiClient.put(`/notifications/${id}/read`);
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (): Promise<void> => {
  await apiClient.put('/notifications/read-all');
};

/**
 * Delete notification
 */
export const deleteNotification = async (id: number): Promise<void> => {
  await apiClient.delete(`/notifications/${id}`);
};

