/**
 * Notification Settings Controller
 */

import { NotificationSettingsModel } from '../models/notificationSettingsModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Get notification settings
 * GET /api/settings/notifications
 */
export const getSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const settings = await NotificationSettingsModel.getByUserId(userId);
    
    res.json(createResponse(true, 'Settings retrieved', { settings }));
  } catch (error) {
    logger.error('Get notification settings error:', error);
    res.status(500).json(createResponse(false, 'Failed to get settings'));
  }
};

/**
 * Update notification settings
 * PUT /api/settings/notifications
 */
export const updateSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updates = req.body;
    
    const settings = await NotificationSettingsModel.update(userId, updates);
    
    logger.info(`Notification settings updated for user ${userId}`);
    res.json(createResponse(true, 'Settings updated', { settings }));
  } catch (error) {
    logger.error('Update notification settings error:', error);
    res.status(500).json(createResponse(false, 'Failed to update settings'));
  }
};

/**
 * Reset settings to default
 * POST /api/settings/notifications/reset
 */
export const resetSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { getDatabase } = await import('../config/database.js');
    const db = getDatabase();
    
    // Delete and recreate
    await db.query('DELETE FROM notification_settings WHERE user_id = $1', [userId]);
    const settings = await NotificationSettingsModel.getByUserId(userId);
    
    logger.info(`Notification settings reset for user ${userId}`);
    res.json(createResponse(true, 'Settings reset to default', { settings }));
  } catch (error) {
    logger.error('Reset notification settings error:', error);
    res.status(500).json(createResponse(false, 'Failed to reset settings'));
  }
};

/**
 * Toggle all email notifications
 * PUT /api/settings/notifications/email/toggle
 */
export const toggleEmail = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { enabled } = req.body;
    
    const settings = await NotificationSettingsModel.update(userId, {
      email_enabled: enabled
    });
    
    res.json(createResponse(true, `Email notifications ${enabled ? 'enabled' : 'disabled'}`, { settings }));
  } catch (error) {
    logger.error('Toggle email notifications error:', error);
    res.status(500).json(createResponse(false, 'Failed to toggle email notifications'));
  }
};

/**
 * Toggle all push notifications
 * PUT /api/settings/notifications/push/toggle
 */
export const togglePush = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { enabled } = req.body;
    
    const settings = await NotificationSettingsModel.update(userId, {
      push_enabled: enabled
    });
    
    res.json(createResponse(true, `Push notifications ${enabled ? 'enabled' : 'disabled'}`, { settings }));
  } catch (error) {
    logger.error('Toggle push notifications error:', error);
    res.status(500).json(createResponse(false, 'Failed to toggle push notifications'));
  }
};

