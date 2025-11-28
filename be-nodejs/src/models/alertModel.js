import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
export class AlertModel {
  static async create(userId, alertData) {
    const db = getDatabase();
    const {
      symbol,
      condition, // 'above', 'below', 'percent_change_up', 'percent_change_down'
      targetValue,
      isActive = true,
      notes
    } = alertData;

    const result = await db.query(
      `INSERT INTO alerts (user_id, symbol, condition, target_value, active, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, symbol.toUpperCase(), condition, targetValue, isActive, notes || null]
    );

    return result.rows[0];
  }
  static async findById(id, userId = null) {
    const db = getDatabase();
    let query = `SELECT * FROM alerts WHERE id = $1`;
    const params = [id];

    if (userId) {
      query += ` AND user_id = $2`;
      params.push(userId);
    }

    const result = await db.query(query, params);
    return result.rows[0] || null;
  }
  static async findByUserId(userId, includeInactive = false) {
    const db = getDatabase();
    let query = `SELECT * FROM alerts WHERE user_id = $1`;
    const params = [userId];

    if (!includeInactive) {
      query += ` AND active = true`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }
  static async findAllActive() {
    const db = getDatabase();
    const result = await db.query(
      `SELECT * FROM alerts WHERE active = true ORDER BY created_at ASC`
    );
    return result.rows;
  }
  static async findActiveBySymbol(symbol) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT * FROM alerts 
       WHERE symbol = $1 AND active = true
       ORDER BY created_at ASC`,
      [symbol.toUpperCase()]
    );
    return result.rows;
  }
  static async update(id, userId, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.condition !== undefined) {
      fields.push(`condition = $${paramIndex++}`);
      values.push(updates.condition);
    }
    if (updates.targetValue !== undefined) {
      fields.push(`target_value = $${paramIndex++}`);
      values.push(updates.targetValue);
    }
    if (updates.isActive !== undefined) {
      fields.push(`active = $${paramIndex++}`);
      values.push(updates.isActive);
    }
    if (updates.notes !== undefined) {
      fields.push(`notes = $${paramIndex++}`);
      values.push(updates.notes);
    }
    if (updates.triggeredAt !== undefined) {
      fields.push(`triggered_at = $${paramIndex++}`);
      values.push(updates.triggeredAt);
    }

    if (fields.length === 0) {
      return await this.findById(id, userId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const result = await db.query(
      `UPDATE alerts 
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
      `DELETE FROM alerts 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    return result.rows[0] || null;
  }
  static async markTriggered(id, triggeredPrice) {
    const db = getDatabase();
    const result = await db.query(
      `UPDATE alerts 
       SET active = false,
           triggered_at = CURRENT_TIMESTAMP,
           triggered_price = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [triggeredPrice, id]
    );

    return result.rows[0] || null;
  }
  static async getHistory(userId, limit = 50) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT * FROM alerts 
       WHERE user_id = $1 AND triggered_at IS NOT NULL
       ORDER BY triggered_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }
}

