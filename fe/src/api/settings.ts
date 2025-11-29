/**
 * Settings API
 */

import apiClient from './client';

export interface NotificationSettings {
  userId: number;
  
  // Email notifications
  emailEnabled: boolean;
  emailNewFollower: boolean;
  emailNewComment: boolean;
  emailNewReaction: boolean;
  emailNewPostFromFollowing: boolean;
  emailMentions: boolean;
  emailAnnouncements: boolean;
  
  // Push notifications (in-app)
  pushEnabled: boolean;
  pushNewFollower: boolean;
  pushNewComment: boolean;
  pushNewReaction: boolean;
  pushNewPostFromFollowing: boolean;
  pushMentions: boolean;
  pushAnnouncements: boolean;
  pushPriceAlerts: boolean;
  
  // Digest
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | 'never';
  
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  
  updatedAt: string;
}

/**
 * Get notification settings
 */
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const { data } = await apiClient.get<{ data: { settings: NotificationSettings } }>('/settings/notifications');
  return data.data.settings;
};

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> => {
  const { data } = await apiClient.put<{ data: { settings: NotificationSettings } }>(
    '/settings/notifications',
    settings
  );
  return data.data.settings;
};

/**
 * Reset to default
 */
export const resetNotificationSettings = async (): Promise<NotificationSettings> => {
  const { data } = await apiClient.post<{ data: { settings: NotificationSettings } }>(
    '/settings/notifications/reset'
  );
  return data.data.settings;
};

/**
 * Toggle all email notifications
 */
export const toggleEmailNotifications = async (enabled: boolean): Promise<NotificationSettings> => {
  const { data } = await apiClient.put<{ data: { settings: NotificationSettings } }>(
    '/settings/notifications/email/toggle',
    { enabled }
  );
  return data.data.settings;
};

/**
 * Toggle all push notifications
 */
export const togglePushNotifications = async (enabled: boolean): Promise<NotificationSettings> => {
  const { data } = await apiClient.put<{ data: { settings: NotificationSettings } }>(
    '/settings/notifications/push/toggle',
    { enabled }
  );
  return data.data.settings;
};


