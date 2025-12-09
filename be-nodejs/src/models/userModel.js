import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class UserModel {
  static async create(userData) {
    try {
      const db = getDatabase();
      const { email, passwordHash, displayName, role = 'user' } = userData;
      const result = await db.query(
        `INSERT INTO users (email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, display_name, role, avatar_url, bio, is_active, created_at`,
        [email, passwordHash, displayName, role]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('UserModel.create - Error:', {
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

  static async findByEmail(email) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT id, email, password_hash, display_name, role, avatar_url, bio, 
              social_links, is_active, last_login, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email]
    );

    return result.rows[0] || null;
  }
  static async findById(id) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT id, email, display_name, role, avatar_url, bio, 
              social_links, is_active, last_login, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }
  static async update(id, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.displayName !== undefined) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(updates.displayName);
    }
    if (updates.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(updates.avatarUrl);
    }
    if (updates.bio !== undefined) {
      fields.push(`bio = $${paramIndex++}`);
      values.push(updates.bio);
    }
    if (updates.socialLinks !== undefined) {
      fields.push(`social_links = $${paramIndex++}`);
      values.push(JSON.stringify(updates.socialLinks));
    }
    if (updates.passwordHash !== undefined) {
      fields.push(`password_hash = $${paramIndex++}`);
      values.push(updates.passwordHash);
    }
    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (fields.length === 0) {
      return await this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query(
      `UPDATE users 
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, email, display_name, role, avatar_url, bio, 
                 social_links, is_active, last_login, created_at, updated_at`,
      values
    );

    return result.rows[0] || null;
  }
  static async updateLastLogin(id) {
    const db = getDatabase();
    await db.query(
      `UPDATE users 
       SET last_login = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  }
  static async emailExists(email) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE email = $1`,
      [email]
    );
    return parseInt(result.rows[0].count) > 0;
  }
  static async getStats(userId) {
    const db = getDatabase();
    
    const [postsCount, commentsCount, watchlistsCount] = await Promise.all([
      db.query(`SELECT COUNT(*) as count FROM posts WHERE user_id = $1`, [userId]),
      db.query(`SELECT COUNT(*) as count FROM comments WHERE user_id = $1`, [userId]),
      db.query(`SELECT COUNT(*) as count FROM watchlists WHERE user_id = $1`, [userId])
    ]);

    return {
      postsCount: parseInt(postsCount.rows[0].count),
      commentsCount: parseInt(commentsCount.rows[0].count),
      watchlistsCount: parseInt(watchlistsCount.rows[0].count)
    };
  }
}

