import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class AnnouncementModel {
  static async create(announcementData) {
    const db = getDatabase();
    const { title, content, type = 'info', priority = 'normal', startsAt, endsAt, createdBy } = announcementData;

    const result = await db.query(
      `INSERT INTO announcements (title, content, type, priority, starts_at, ends_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, content, type, priority, startsAt || new Date(), endsAt || null, createdBy || null]
    );

    return result.rows[0];
  }

  static async findById(id) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT a.*, u.display_name as created_by_name
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findMany(options = {}) {
    const db = getDatabase();
    const { page = 0, size = 20, isActive = null, type = null } = options;

    let query = `
      SELECT a.*, u.display_name as created_by_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (isActive !== null) {
      query += ` AND a.is_active = $${paramIndex++}`;
      params.push(isActive);
    }

    if (type) {
      query += ` AND a.type = $${paramIndex++}`;
      params.push(type);
    }

    query += ` ORDER BY a.priority DESC, a.created_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(size, page * size);

    const result = await db.query(query, params);

    const countQuery = `
      SELECT COUNT(*) as total FROM announcements WHERE 1=1
      ${isActive !== null ? `AND is_active = ${isActive}` : ''}
      ${type ? `AND type = '${type}'` : ''}
    `;
    const countResult = await db.query(countQuery);
    const total = parseInt(countResult.rows[0].total);

    return {
      items: result.rows,
      total,
      page,
      size
    };
  }

  static async findActive() {
    const db = getDatabase();
    const now = new Date();
    const result = await db.query(
      `SELECT a.*, u.display_name as created_by_name
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.is_active = true
         AND a.starts_at <= $1
         AND (a.ends_at IS NULL OR a.ends_at >= $1)
       ORDER BY a.priority DESC, a.created_at DESC`,
      [now]
    );
    return result.rows;
  }

  static async update(id, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      values.push(updates.content);
    }
    if (updates.type !== undefined) {
      fields.push(`type = $${paramIndex++}`);
      values.push(updates.type);
    }
    if (updates.priority !== undefined) {
      fields.push(`priority = $${paramIndex++}`);
      values.push(updates.priority);
    }
    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }
    if (updates.startsAt !== undefined) {
      fields.push(`starts_at = $${paramIndex++}`);
      values.push(updates.startsAt);
    }
    if (updates.endsAt !== undefined) {
      fields.push(`ends_at = $${paramIndex++}`);
      values.push(updates.endsAt);
    }

    if (fields.length === 0) {
      return await this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query(
      `UPDATE announcements 
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  static async delete(id) {
    const db = getDatabase();
    const result = await db.query(
      `DELETE FROM announcements WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }
}

