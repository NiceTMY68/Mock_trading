import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
export class PostModel {
  static async create(userId, postData) {
    const db = getDatabase();
    const { title, content, tags = [], mentions = [] } = postData;

    const result = await db.query(
      `INSERT INTO posts (user_id, title, content, tags, mentions, status)
       VALUES ($1, $2, $3, $4, $5, 'published')
       RETURNING *`,
      [userId, title, content, JSON.stringify(tags), JSON.stringify(mentions)]
    );

    return result.rows[0];
  }
  static async findById(id, includeUser = false) {
    const db = getDatabase();
    let query = `
      SELECT p.*,
             u.display_name as author_name,
             u.avatar_url as author_avatar
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }
  static async findMany(options = {}) {
    const db = getDatabase();
    const {
      page = 0,
      size = 20,
      userId = null,
      status = 'published',
      sortBy = 'created_at',
      order = 'DESC',
      search = null
    } = options;

    let query = `
      SELECT p.*,
             u.display_name as author_name,
             u.avatar_url as author_avatar,
             COUNT(DISTINCT c.id) as comments_count,
             COUNT(DISTINCT r.id) as reactions_count
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN comments c ON c.post_id = p.id
      LEFT JOIN reactions r ON r.post_id = p.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND p.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (status) {
      query += ` AND p.status = $${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      query += ` AND (p.title ILIKE $${paramIndex} OR p.content ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY p.id, u.display_name, u.avatar_url`;

    const validSortBy = ['created_at', 'updated_at', 'title', 'reactions_count', 'comments_count'];
    const actualSortBy = validSortBy.includes(sortBy) ? sortBy : 'created_at';
    const actualOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${actualSortBy} ${actualOrder}`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(size, page * size);

    const result = await db.query(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM posts WHERE 1=1`;
    const countParams = [];
    let countParamIndex = 1;

    if (userId) {
      countQuery += ` AND user_id = $${countParamIndex++}`;
      countParams.push(userId);
    }
    if (status) {
      countQuery += ` AND status = $${countParamIndex++}`;
      countParams.push(status);
    }
    if (search) {
      countQuery += ` AND (title ILIKE $${countParamIndex} OR content ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    return {
      items: result.rows.map(row => ({
        ...row,
        tags: row.tags || [],
        mentions: row.mentions || [],
        commentsCount: parseInt(row.comments_count) || 0,
        reactionsCount: parseInt(row.reactions_count) || 0
      })),
      total,
      page,
      size,
      pages: Math.ceil(total / size)
    };
  }
  static async update(id, userId, updates) {
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
    if (updates.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.mentions !== undefined) {
      fields.push(`mentions = $${paramIndex++}`);
      values.push(JSON.stringify(updates.mentions));
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (fields.length === 0) {
      return await this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const result = await db.query(
      `UPDATE posts 
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
      `DELETE FROM posts 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    return result.rows[0] || null;
  }
  static async findByIdWithDetails(id, currentUserId = null) {
    const db = getDatabase();

    const postResult = await db.query(
      `SELECT p.*,
              u.display_name as author_name,
              u.avatar_url as author_avatar
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (postResult.rows.length === 0) {
      return null;
    }

    const post = postResult.rows[0];

    const reactionsResult = await db.query(
      `SELECT r.*, u.display_name as user_name
       FROM reactions r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.post_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    const commentsResult = await db.query(
      `SELECT c.*, u.display_name as author_name, u.avatar_url as author_avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );

    let userReaction = null;
    if (currentUserId) {
      const userReactionResult = await db.query(
        `SELECT * FROM reactions WHERE post_id = $1 AND user_id = $2`,
        [id, currentUserId]
      );
      userReaction = userReactionResult.rows[0] || null;
    }

    return {
      ...post,
      tags: post.tags || [],
      mentions: post.mentions || [],
      reactions: reactionsResult.rows,
      comments: commentsResult.rows,
      userReaction,
      reactionsCount: reactionsResult.rows.length,
      commentsCount: commentsResult.rows.length
    };
  }
}

