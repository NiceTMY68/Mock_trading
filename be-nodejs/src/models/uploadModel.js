/**
 * Upload Model
 * 
 * Handles file upload tracking
 */

import { getDatabase } from '../config/database.js';

export const UploadModel = {
  /**
   * Create upload record
   */
  async create(data) {
    const db = getDatabase();
    
    const result = await db.query(
      `INSERT INTO uploads 
       (user_id, original_name, filename, mimetype, size, path, thumbnail_path, width, height, upload_type, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.userId,
        data.originalName,
        data.filename,
        data.mimetype,
        data.size,
        data.path,
        data.thumbnailPath || null,
        data.width || null,
        data.height || null,
        data.uploadType || 'post',
        data.isPublic !== false
      ]
    );
    
    return result.rows[0];
  },

  /**
   * Get upload by ID
   */
  async getById(id) {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM uploads WHERE id = $1', [id]);
    return result.rows[0];
  },

  /**
   * Get upload by filename
   */
  async getByFilename(filename) {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM uploads WHERE filename = $1', [filename]);
    return result.rows[0];
  },

  /**
   * Get uploads by user
   */
  async getByUserId(userId, options = {}) {
    const { page = 0, size = 20, uploadType = null } = options;
    const db = getDatabase();
    
    let query = 'SELECT * FROM uploads WHERE user_id = $1';
    const params = [userId];
    let paramIndex = 2;
    
    if (uploadType) {
      query += ` AND upload_type = $${paramIndex++}`;
      params.push(uploadType);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(size, page * size);
    
    const result = await db.query(query, params);
    return result.rows;
  },

  /**
   * Delete upload
   */
  async delete(id, userId) {
    const db = getDatabase();
    const result = await db.query(
      'DELETE FROM uploads WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  },

  /**
   * Link upload to post
   */
  async linkToPost(postId, uploadId, position = 0, caption = null) {
    const db = getDatabase();
    
    await db.query(
      `INSERT INTO post_images (post_id, upload_id, position, caption)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (post_id, upload_id) DO UPDATE SET position = $3, caption = $4`,
      [postId, uploadId, position, caption]
    );
    
    // Update image count on post
    await db.query(
      `UPDATE posts SET image_count = (
        SELECT COUNT(*) FROM post_images WHERE post_id = $1
      ) WHERE id = $1`,
      [postId]
    );
  },

  /**
   * Unlink upload from post
   */
  async unlinkFromPost(postId, uploadId) {
    const db = getDatabase();
    
    await db.query(
      'DELETE FROM post_images WHERE post_id = $1 AND upload_id = $2',
      [postId, uploadId]
    );
    
    // Update image count on post
    await db.query(
      `UPDATE posts SET image_count = (
        SELECT COUNT(*) FROM post_images WHERE post_id = $1
      ) WHERE id = $1`,
      [postId]
    );
  },

  /**
   * Get images for a post
   */
  async getByPostId(postId) {
    const db = getDatabase();
    
    const result = await db.query(
      `SELECT u.*, pi.position, pi.caption
       FROM uploads u
       JOIN post_images pi ON u.id = pi.upload_id
       WHERE pi.post_id = $1
       ORDER BY pi.position ASC`,
      [postId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      mimetype: row.mimetype,
      size: row.size,
      path: row.path,
      thumbnailPath: row.thumbnail_path,
      width: row.width,
      height: row.height,
      position: row.position,
      caption: row.caption,
      url: `/uploads/${row.path}`,
      thumbnailUrl: row.thumbnail_path ? `/uploads/${row.thumbnail_path}` : null
    }));
  },

  /**
   * Get storage stats for a user
   */
  async getStorageStats(userId) {
    const db = getDatabase();
    
    const result = await db.query(
      `SELECT 
         COUNT(*) as file_count,
         SUM(size) as total_size,
         upload_type,
         COUNT(*) FILTER (WHERE mimetype LIKE 'image/%') as image_count,
         COUNT(*) FILTER (WHERE mimetype LIKE 'video/%') as video_count
       FROM uploads 
       WHERE user_id = $1
       GROUP BY upload_type`,
      [userId]
    );
    
    return result.rows;
  }
};

