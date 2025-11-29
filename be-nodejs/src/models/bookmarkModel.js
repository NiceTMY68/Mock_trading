/**
 * Bookmark Model
 * 
 * Handles saving/bookmarking posts
 */

import { getDatabase } from '../config/database.js';

export const BookmarkModel = {
  /**
   * Add bookmark
   */
  async add(userId, postId, collection = 'default') {
    const db = getDatabase();
    
    const result = await db.query(
      `INSERT INTO bookmarks (user_id, post_id, collection)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, post_id) DO UPDATE SET collection = $3
       RETURNING *`,
      [userId, postId, collection]
    );

    // Update bookmark count on post
    await db.query(
      'UPDATE posts SET bookmark_count = bookmark_count + 1 WHERE id = $1',
      [postId]
    );

    return result.rows[0];
  },

  /**
   * Remove bookmark
   */
  async remove(userId, postId) {
    const db = getDatabase();
    
    const result = await db.query(
      'DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2 RETURNING *',
      [userId, postId]
    );

    if (result.rows.length > 0) {
      // Update bookmark count on post
      await db.query(
        'UPDATE posts SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = $1',
        [postId]
      );
    }

    return result.rows[0];
  },

  /**
   * Check if bookmarked
   */
  async isBookmarked(userId, postId) {
    const db = getDatabase();
    const result = await db.query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );
    return result.rows.length > 0;
  },

  /**
   * Get user's bookmarks with pagination
   */
  async getByUserId(userId, options = {}) {
    const { page = 0, size = 20, collection = null } = options;
    const db = getDatabase();

    let query = `
      SELECT b.*, 
             p.title, p.content, p.tags, p.created_at as post_created_at,
             p.view_count, p.bookmark_count,
             u.display_name as author_name, u.avatar_url as author_avatar,
             COUNT(DISTINCT r.id) as reactions_count,
             COUNT(DISTINCT c.id) as comments_count
      FROM bookmarks b
      JOIN posts p ON b.post_id = p.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN reactions r ON r.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      WHERE b.user_id = $1 AND p.status = 'published'
    `;

    const params = [userId];
    let paramIndex = 2;

    if (collection) {
      query += ` AND b.collection = $${paramIndex++}`;
      params.push(collection);
    }

    query += ` GROUP BY b.id, p.id, u.display_name, u.avatar_url`;
    query += ` ORDER BY b.created_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(size, page * size);

    const result = await db.query(query, params);

    // Get total count
    const countQuery = collection
      ? 'SELECT COUNT(*) as total FROM bookmarks WHERE user_id = $1 AND collection = $2'
      : 'SELECT COUNT(*) as total FROM bookmarks WHERE user_id = $1';
    const countResult = await db.query(countQuery, collection ? [userId, collection] : [userId]);

    return {
      items: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      size
    };
  },

  /**
   * Get user's collections
   */
  async getCollections(userId) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT collection, COUNT(*) as count
       FROM bookmarks
       WHERE user_id = $1
       GROUP BY collection
       ORDER BY count DESC`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Move bookmark to different collection
   */
  async moveToCollection(userId, postId, collection) {
    const db = getDatabase();
    const result = await db.query(
      'UPDATE bookmarks SET collection = $1 WHERE user_id = $2 AND post_id = $3 RETURNING *',
      [collection, userId, postId]
    );
    return result.rows[0];
  }
};

