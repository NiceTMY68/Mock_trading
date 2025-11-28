import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class FailedLoginModel {
  static async create(attemptData) {
    const db = getDatabase();
    const { email, ipAddress, userAgent, reason } = attemptData;

    const result = await db.query(
      `INSERT INTO failed_login_attempts (email, ip_address, user_agent, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email, ipAddress || null, userAgent || null, reason || null]
    );

    return result.rows[0];
  }

  static async findMany(options = {}) {
    const db = getDatabase();
    const { page = 0, size = 50, email = null, ipAddress = null, startDate = null, endDate = null } = options;

    let query = `SELECT * FROM failed_login_attempts WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (email) {
      query += ` AND email = $${paramIndex++}`;
      params.push(email);
    }

    if (ipAddress) {
      query += ` AND ip_address = $${paramIndex++}`;
      params.push(ipAddress);
    }

    if (startDate) {
      query += ` AND attempted_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND attempted_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` ORDER BY attempted_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(size, page * size);

    const result = await db.query(query, params);

    const countQuery = query.replace(/SELECT \*/, 'SELECT COUNT(*) as total').replace(/ORDER BY.*$/, '');
    const countResult = await db.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    return {
      items: result.rows,
      total,
      page,
      size
    };
  }

  static async getStats(days = 7) {
    const db = getDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db.query(
      `SELECT 
        COUNT(*) as total_attempts,
        COUNT(DISTINCT email) as unique_emails,
        COUNT(DISTINCT ip_address) as unique_ips,
        MAX(attempted_at) as last_attempt
       FROM failed_login_attempts
       WHERE attempted_at >= $1`,
      [startDate]
    );

    return result.rows[0];
  }

  static async getTopFailedEmails(limit = 10) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT email, COUNT(*) as attempt_count
       FROM failed_login_attempts
       WHERE attempted_at >= NOW() - INTERVAL '7 days'
       GROUP BY email
       ORDER BY attempt_count DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async getTopFailedIPs(limit = 10) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT ip_address, COUNT(*) as attempt_count
       FROM failed_login_attempts
       WHERE attempted_at >= NOW() - INTERVAL '7 days'
         AND ip_address IS NOT NULL
       GROUP BY ip_address
       ORDER BY attempt_count DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}

