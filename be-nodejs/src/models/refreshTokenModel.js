import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
export class RefreshTokenModel {
  static async create(userId, token, expiresAt) {
    try {
      const db = getDatabase();
      const result = await db.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, token, expiresAt]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('RefreshTokenModel.create - Error:', {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        constraint: error?.constraint,
        table: error?.table,
        column: error?.column
      });
      throw error;
    }
  }
  static async findByToken(token) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    return result.rows[0] || null;
  }
  static async delete(token) {
    const db = getDatabase();
    await db.query(`DELETE FROM refresh_tokens WHERE token = $1`, [token]);
  }
  static async deleteAllForUser(userId) {
    const db = getDatabase();
    await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
  }
  static async deleteExpired() {
    const db = getDatabase();
    const result = await db.query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW() RETURNING COUNT(*)`
    );
    return result.rowCount || 0;
  }
}

