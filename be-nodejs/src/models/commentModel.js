import { getDatabase } from '../config/database.js';
export class CommentModel {
  static async create(userId, postId, content, parentId = null) {
    const db = getDatabase();
    const result = await db.query(
      `INSERT INTO comments (user_id, post_id, content, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, postId, content, parentId]
    );

    return result.rows[0];
  }
  static async findById(id) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT c.*,
              u.display_name as author_name,
              u.avatar_url as author_avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }
  static async findByPostId(postId, includeReplies = true) {
    const db = getDatabase();
    let query = `
      SELECT c.*,
             u.display_name as author_name,
             u.avatar_url as author_avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
    `;

    if (includeReplies) {
      query += ` ORDER BY c.created_at ASC`;
    } else {
      query += ` AND c.parent_id IS NULL ORDER BY c.created_at ASC`;
    }

    const result = await db.query(query, [postId]);
    return result.rows;
  }
  static async update(id, userId, content) {
    const db = getDatabase();
    const result = await db.query(
      `UPDATE comments 
       SET content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [content, id, userId]
    );

    return result.rows[0] || null;
  }
  static async delete(id, userId) {
    const db = getDatabase();
    const result = await db.query(
      `DELETE FROM comments 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    return result.rows[0] || null;
  }
}

