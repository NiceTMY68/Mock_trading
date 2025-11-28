import { NotificationModel } from '../models/notificationModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Get notifications for current user
 * GET /api/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0, unreadOnly = false, type = null } = req.query;

    const notifications = await NotificationModel.findByUserId(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      unreadOnly: unreadOnly === 'true',
      type: type || null
    });

    const unreadCount = await NotificationModel.getUnreadCount(userId);

    res.json(createResponse(true, 'Notifications retrieved', {
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data ? (typeof n.data === 'string' ? JSON.parse(n.data) : n.data) : null,
        isRead: n.is_read,
        createdAt: n.created_at
      })),
      unreadCount
    }));
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await NotificationModel.markAsRead(parseInt(id), userId);

    if (!notification) {
      return res.status(404).json(createResponse(false, 'Notification not found'));
    }

    res.json(createResponse(true, 'Notification marked as read'));
  } catch (error) {
    logger.error('Mark as read error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    await NotificationModel.markAllAsRead(userId);

    res.json(createResponse(true, 'All notifications marked as read'));
  } catch (error) {
    logger.error('Mark all as read error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await NotificationModel.delete(parseInt(id), userId);

    if (!notification) {
      return res.status(404).json(createResponse(false, 'Notification not found'));
    }

    res.json(createResponse(true, 'Notification deleted'));
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

