import { getDatabase } from '../config/database.js';
export class ReportModel {
  static async create(reportData) {
    const db = getDatabase();

    const existing = await db.query(
      `SELECT * FROM reports 
       WHERE reporter_id = $1 
       AND target_type = $2 
       AND target_id = $3`,
      [reportData.reporterId, reportData.targetType, reportData.targetId]
    );
    
    if (existing.rows.length > 0) {
      throw new Error('You have already reported this item');
    }
    
    const result = await db.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [
        reportData.reporterId,
        reportData.targetType,
        reportData.targetId,
        reportData.reason
      ]
    );
    
    return result.rows[0];
  }
  static async findAll({ status = null, limit = 50, offset = 0 } = {}) {
    const db = getDatabase();
    
    let query = `
      SELECT 
        r.*,
        u.display_name as reporter_name,
        CASE 
          WHEN r.target_type = 'post' THEN p.title
          WHEN r.target_type = 'comment' THEN c.content
        END as reported_content
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      LEFT JOIN posts p ON r.target_type = 'post' AND r.target_id = p.id
      LEFT JOIN comments c ON r.target_type = 'comment' AND r.target_id = c.id
    `;
    
    const params = [];
    if (status) {
      params.push(status);
      query += ` WHERE r.status = $${params.length}`;
    }
    
    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    return result.rows;
  }
  static async updateStatus(reportId, status, adminId) {
    const db = getDatabase();
    
    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    const result = await db.query(
      `UPDATE reports 
       SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, adminId, reportId]
    );
    
    return result.rows[0];
  }
}

