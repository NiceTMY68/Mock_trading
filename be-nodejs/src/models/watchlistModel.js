import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
export class WatchlistModel {
  static async create(userId, name = 'My Watchlist') {
    const db = getDatabase();

    const maxOrderResult = await db.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 as next_order
       FROM watchlists WHERE user_id = $1`,
      [userId]
    );
    const nextOrder = maxOrderResult.rows[0].next_order;

    const result = await db.query(
      `INSERT INTO watchlists (user_id, name, symbols, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, name, JSON.stringify([]), nextOrder]
    );

    return result.rows[0];
  }
  static async findById(id, userId = null) {
    const db = getDatabase();
    let query = `SELECT * FROM watchlists WHERE id = $1`;
    const params = [id];

    if (userId) {
      query += ` AND user_id = $2`;
      params.push(userId);
    }

    const result = await db.query(query, params);
    return result.rows[0] || null;
  }
  static async findByUserId(userId) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT * FROM watchlists
       WHERE user_id = $1
       ORDER BY order_index ASC, created_at ASC`,
      [userId]
    );

    return result.rows;
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
    if (updates.symbols !== undefined) {
      fields.push(`symbols = $${paramIndex++}`);
      values.push(JSON.stringify(updates.symbols));
    }
    if (updates.orderIndex !== undefined) {
      fields.push(`order_index = $${paramIndex++}`);
      values.push(updates.orderIndex);
    }

    if (fields.length === 0) {
      return await this.findById(id, userId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const result = await db.query(
      `UPDATE watchlists 
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }
  static async addSymbol(id, userId, symbol) {
    const watchlist = await this.findById(id, userId);
    if (!watchlist) {
      return null;
    }

    const symbols = watchlist.symbols || [];
    const normalizedSymbol = symbol.toUpperCase();

    if (symbols.includes(normalizedSymbol)) {
      return watchlist; // Already exists
    }

    symbols.push(normalizedSymbol);
    return await this.update(id, userId, { symbols });
  }
  static async removeSymbol(id, userId, symbol) {
    const watchlist = await this.findById(id, userId);
    if (!watchlist) {
      return null;
    }

    const symbols = (watchlist.symbols || []).filter(s => s.toUpperCase() !== symbol.toUpperCase());
    return await this.update(id, userId, { symbols });
  }
  static async reorder(userId, watchlistIds) {
    const db = getDatabase();

    for (let i = 0; i < watchlistIds.length; i++) {
      await db.query(
        `UPDATE watchlists 
         SET order_index = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3`,
        [i, watchlistIds[i], userId]
      );
    }

    return await this.findByUserId(userId);
  }
  static async delete(id, userId) {
    const db = getDatabase();
    const result = await db.query(
      `DELETE FROM watchlists 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    return result.rows[0] || null;
  }
  static async getAllUserSymbols(userId) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT DISTINCT jsonb_array_elements_text(symbols) as symbol
       FROM watchlists
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows.map(row => row.symbol);
  }
}

