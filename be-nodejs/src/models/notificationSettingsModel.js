/**
 * Notification Settings Model
 * 
 * Handles user notification preferences
 */

import { getDatabase } from '../config/database.js';

export const NotificationSettingsModel = {
  /**
   * Get settings for a user (create if not exists)
   */
  async getByUserId(userId) {
    const db = getDatabase();
    
    // Try to get existing
    let result = await db.query(
      'SELECT * FROM notification_settings WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length > 0) {
      return this.formatSettings(result.rows[0]);
    }
    
    // Create default settings
    result = await db.query(
      'INSERT INTO notification_settings (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
    
    return this.formatSettings(result.rows[0]);
  },

  /**
   * Update settings
   */
  async update(userId, settings) {
    const db = getDatabase();
    
    const allowedFields = [
      'email_enabled', 'email_new_follower', 'email_new_comment',
      'email_new_reaction', 'email_new_post_from_following',
      'email_mentions', 'email_announcements',
      'push_enabled', 'push_new_follower', 'push_new_comment',
      'push_new_reaction', 'push_new_post_from_following',
      'push_mentions', 'push_announcements', 'push_price_alerts',
      'digest_enabled', 'digest_frequency',
      'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end'
    ];
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    for (const field of allowedFields) {
      if (settings[field] !== undefined) {
        // Convert camelCase to snake_case
        const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        updates.push(`${snakeField} = $${paramIndex++}`);
        values.push(settings[field]);
      }
    }
    
    if (updates.length === 0) {
      return this.getByUserId(userId);
    }
    
    values.push(userId);
    
    const result = await db.query(
      `UPDATE notification_settings 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      // Settings don't exist, create them first
      await db.query(
        'INSERT INTO notification_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [userId]
      );
      return this.update(userId, settings);
    }
    
    return this.formatSettings(result.rows[0]);
  },

  /**
   * Check if user should receive a specific notification type
   */
  async shouldNotify(userId, notificationType, channel = 'push') {
    const settings = await this.getByUserId(userId);
    
    // Check if channel is enabled
    if (channel === 'email' && !settings.emailEnabled) return false;
    if (channel === 'push' && !settings.pushEnabled) return false;
    
    // Check specific notification type
    const settingKey = `${channel}${notificationType.charAt(0).toUpperCase() + notificationType.slice(1)}`;
    
    // Check quiet hours for push notifications
    if (channel === 'push' && settings.quietHoursEnabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
      const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);
      
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startTime > endTime) {
        if (currentTime >= startTime || currentTime < endTime) {
          return false;
        }
      } else {
        if (currentTime >= startTime && currentTime < endTime) {
          return false;
        }
      }
    }
    
    return settings[settingKey] !== false;
  },

  /**
   * Format settings from snake_case to camelCase
   */
  formatSettings(row) {
    if (!row) return null;
    
    return {
      userId: row.user_id,
      
      // Email settings
      emailEnabled: row.email_enabled,
      emailNewFollower: row.email_new_follower,
      emailNewComment: row.email_new_comment,
      emailNewReaction: row.email_new_reaction,
      emailNewPostFromFollowing: row.email_new_post_from_following,
      emailMentions: row.email_mentions,
      emailAnnouncements: row.email_announcements,
      
      // Push settings
      pushEnabled: row.push_enabled,
      pushNewFollower: row.push_new_follower,
      pushNewComment: row.push_new_comment,
      pushNewReaction: row.push_new_reaction,
      pushNewPostFromFollowing: row.push_new_post_from_following,
      pushMentions: row.push_mentions,
      pushAnnouncements: row.push_announcements,
      pushPriceAlerts: row.push_price_alerts,
      
      // Digest settings
      digestEnabled: row.digest_enabled,
      digestFrequency: row.digest_frequency,
      
      // Quiet hours
      quietHoursEnabled: row.quiet_hours_enabled,
      quietHoursStart: row.quiet_hours_start,
      quietHoursEnd: row.quiet_hours_end,
      
      updatedAt: row.updated_at
    };
  }
};

