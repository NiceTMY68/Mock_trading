import { getDatabase } from '../config/database.js';
export class NotificationModel {
  static async create(notificationData) {
    const db = getDatabase();
    const {
      userId,
      type, // 'alert', 'mention', 'comment', 'reaction', 'system'
      title,
      message,
      data = null,
      isRead = false
    } = notificationData;

    const result = await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data, is_read)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, type, title, message, data ? JSON.stringify(data) : null, isRead]
    );

    return result.rows[0];
  }
  static async findByUserId(userId, options = {}) {
    const db = getDatabase();
    const {
      limit = 50,
      offset = 0,
      unreadOnly = false,
      type = null
    } = options;

    let query = `SELECT * FROM notifications WHERE user_id = $1`;
    const params = [userId];
    let paramIndex = 2;

    if (unreadOnly) {
      query += ` AND is_read = false`;
    }

    if (type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }
  static async markAsRead(id, userId) {
    const db = getDatabase();
    const result = await db.query(
      `UPDATE notifications 
       SET is_read = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    return result.rows[0] || null;
  }
  static async markAllAsRead(userId) {
    const db = getDatabase();
    await db.query(
      `UPDATE notifications 
       SET is_read = true, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
  }
  static async getUnreadCount(userId) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    return parseInt(result.rows[0].count) || 0;
  }
  static async delete(id, userId) {
    const db = getDatabase();
    const result = await db.query(
      `DELETE FROM notifications 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    return result.rows[0] || null;
  }
}

