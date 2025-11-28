import { getDatabase } from '../config/database.js';
export class ReactionModel {
  static async toggle(userId, postId, type = 'like') {
    const db = getDatabase();

    const existing = await db.query(
      `SELECT * FROM reactions WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    );

    if (existing.rows.length > 0) {
      const existingReaction = existing.rows[0];

      if (existingReaction.type === type) {
        await db.query(
          `DELETE FROM reactions WHERE user_id = $1 AND post_id = $2`,
          [userId, postId]
        );
        return null;
      } else {

        const result = await db.query(
          `UPDATE reactions 
           SET type = $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2 AND post_id = $3
           RETURNING *`,
          [type, userId, postId]
        );
        return result.rows[0];
      }
    } else {

      const result = await db.query(
        `INSERT INTO reactions (user_id, post_id, type)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, postId, type]
      );
      return result.rows[0];
    }
  }
  static async findByPostId(postId) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT r.*,
              u.display_name as user_name,
              u.avatar_url as user_avatar
       FROM reactions r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.post_id = $1
       ORDER BY r.created_at DESC`,
      [postId]
    );

    return result.rows;
  }
  static async getCountsByPostId(postId) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT type, COUNT(*) as count
       FROM reactions
       WHERE post_id = $1
       GROUP BY type`,
      [postId]
    );

    const counts = {};
    result.rows.forEach(row => {
      counts[row.type] = parseInt(row.count);
    });

    return counts;
  }
  static async getUserReaction(userId, postId) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT * FROM reactions WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    );

    return result.rows[0] || null;
  }
}

