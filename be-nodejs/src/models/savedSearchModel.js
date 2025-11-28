import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class SavedSearchModel {
  static async create(userId, searchData) {
    const db = getDatabase();
    const { name, searchType, queryParams } = searchData;

    const result = await db.query(
      `INSERT INTO saved_searches (user_id, name, search_type, query_params)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, name, searchType, JSON.stringify(queryParams)]
    );

    return result.rows[0];
  }

  static async findByUserId(userId) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT * FROM saved_searches
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async findById(id, userId) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT * FROM saved_searches
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rows[0] || null;
  }

  static async update(id, userId, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.queryParams !== undefined) {
      fields.push(`query_params = $${paramIndex++}`);
      values.push(JSON.stringify(updates.queryParams));
    }

    if (fields.length === 0) {
      return await this.findById(id, userId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const result = await db.query(
      `UPDATE saved_searches 
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  static async delete(id, userId) {
    const db = getDatabase();
    const result = await db.query(
      `DELETE FROM saved_searches 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );
    return result.rows[0] || null;
  }
}

