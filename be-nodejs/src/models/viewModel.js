/**
 * View Model
 * 
 * Handles post view tracking
 */

import { getDatabase } from '../config/database.js';
import crypto from 'crypto';

export const ViewModel = {
  /**
   * Hash IP for privacy
   */
  hashIP(ip) {
    if (!ip) return null;
    return crypto.createHash('sha256').update(ip + 'salt_view_tracking').digest('hex');
  },

  /**
   * Record a view
   * Returns true if new view, false if duplicate (within timeframe)
   */
  async recordView(postId, options = {}) {
    const { userId = null, ip = null, userAgent = null } = options;
    const db = getDatabase();
    
    const ipHash = this.hashIP(ip);
    
    // Check for duplicate view (same user or IP within 1 hour)
    const duplicateCheck = await db.query(`
      SELECT id FROM post_views 
      WHERE post_id = $1 
        AND created_at > NOW() - INTERVAL '1 hour'
        AND (
          (user_id IS NOT NULL AND user_id = $2)
          OR (user_id IS NULL AND ip_hash = $3)
        )
      LIMIT 1`,
      [postId, userId, ipHash]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return false; // Duplicate view, don't count
    }
    
    // Record new view
    await db.query(
      `INSERT INTO post_views (post_id, user_id, ip_hash, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [postId, userId, ipHash, userAgent]
    );
    
    // Update post view count
    await db.query(
      'UPDATE posts SET view_count = view_count + 1 WHERE id = $1',
      [postId]
    );
    
    return true;
  },

  /**
   * Get view count for a post
   */
  async getViewCount(postId) {
    const db = getDatabase();
    const result = await db.query(
      'SELECT view_count FROM posts WHERE id = $1',
      [postId]
    );
    return result.rows[0]?.view_count || 0;
  },

  /**
   * Get view analytics for a post
   */
  async getAnalytics(postId, days = 30) {
    const db = getDatabase();
    
    // Views by day
    const dailyViews = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as views
      FROM post_views
      WHERE post_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date`,
      [postId]
    );
    
    // Unique vs total views
    const viewStats = await db.query(`
      SELECT 
        COUNT(*) as total_views,
        COUNT(DISTINCT COALESCE(user_id::text, ip_hash)) as unique_views
      FROM post_views
      WHERE post_id = $1 AND created_at > NOW() - INTERVAL '${days} days'`,
      [postId]
    );
    
    return {
      dailyViews: dailyViews.rows,
      ...viewStats.rows[0]
    };
  },

  /**
   * Update trending scores for all posts
   */
  async updateTrendingScores() {
    const db = getDatabase();
    
    await db.query(`
      UPDATE posts p
      SET trending_score = calculate_trending_score(
        p.view_count,
        (SELECT COUNT(*) FROM reactions WHERE post_id = p.id),
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id),
        p.bookmark_count,
        p.created_at
      )
      WHERE p.status = 'published'
        AND p.created_at > NOW() - INTERVAL '30 days'
    `);
  },

  /**
   * Get trending posts
   * Uses a calculated score based on reactions + comments + views
   */
  async getTrendingPosts(options = {}) {
    const { page = 0, size = 20, days = 7 } = options;
    const db = getDatabase();
    
    // Calculate trending score on-the-fly to avoid dependency on trending_score column
    const result = await db.query(`
      SELECT p.id, p.user_id, p.title, p.content, p.tags, p.status,
             p.created_at, p.updated_at,
             COALESCE(p.view_count, 0) as view_count,
             COALESCE(p.bookmark_count, 0) as bookmark_count,
             u.display_name as author_name, 
             u.avatar_url as author_avatar,
             COUNT(DISTINCT r.id) as reactions_count,
             COUNT(DISTINCT c.id) as comments_count,
             (COUNT(DISTINCT r.id) * 2 + COUNT(DISTINCT c.id) * 3 + COALESCE(p.view_count, 0) * 0.1) as trending_score
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN reactions r ON r.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      WHERE p.status = 'published'
        AND p.created_at > NOW() - INTERVAL '${days} days'
      GROUP BY p.id, u.display_name, u.avatar_url
      ORDER BY trending_score DESC, p.created_at DESC
      LIMIT $1 OFFSET $2`,
      [size, page * size]
    );
    
    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM posts 
      WHERE status = 'published' 
        AND created_at > NOW() - INTERVAL '${days} days'`
    );
    
    return {
      items: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      size
    };
  }
};

