import { getDatabase } from '../config/database.js';
export class SystemLogModel {
  static async create(logData) {
    const db = getDatabase();
    
    const result = await db.query(
      `INSERT INTO system_logs (level, message, metadata, user_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        logData.level,
        logData.message,
        JSON.stringify(logData.metadata || {}),
        logData.userId || null,
        logData.ipAddress || null,
        logData.userAgent || null
      ]
    );
    
    return result.rows[0];
  }
  static async findMany({ level = null, userId = null, limit = 100, offset = 0, startDate = null, endDate = null } = {}) {
    const db = getDatabase();
    
    let query = `SELECT * FROM system_logs WHERE 1=1`;
    const params = [];
    let paramIndex = 1;
    
    if (level) {
      query += ` AND level = $${paramIndex++}`;
      params.push(level);
    }
    
    if (userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }
    
    if (startDate) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    return result.rows;
  }
  static async getCountsByLevel(days = 7) {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await db.query(
      `SELECT level, COUNT(*) as count
       FROM system_logs
       WHERE created_at >= $1
       GROUP BY level
       ORDER BY count DESC`,
      [cutoffDate]
    );
    
    return result.rows;
  }
}

