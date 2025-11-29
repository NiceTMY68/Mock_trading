/**
 * Hashtag Model
 * 
 * Handles hashtag management and auto-detection
 */

import { getDatabase } from '../config/database.js';

export const HashtagModel = {
  /**
   * Extract hashtags from text
   * @param {string} text - Text to extract hashtags from
   * @returns {string[]} Array of hashtags (without #)
   */
  extractHashtags(text) {
    if (!text) return [];
    
    // Match #word patterns, support Unicode letters
    const regex = /#([\w\u0080-\uFFFF]+)/g;
    const matches = text.match(regex) || [];
    
    // Remove # and convert to lowercase, deduplicate
    const hashtags = [...new Set(
      matches.map(tag => tag.slice(1).toLowerCase())
    )];
    
    return hashtags.filter(tag => tag.length >= 2 && tag.length <= 50);
  },

  /**
   * Get or create hashtag
   */
  async getOrCreate(name) {
    const db = getDatabase();
    const normalizedName = name.toLowerCase().trim();
    
    // Try to get existing
    let result = await db.query(
      'SELECT * FROM hashtags WHERE name = $1',
      [normalizedName]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Create new
    result = await db.query(
      'INSERT INTO hashtags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
      [normalizedName]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // If conflict, fetch again
    result = await db.query('SELECT * FROM hashtags WHERE name = $1', [normalizedName]);
    return result.rows[0];
  },

  /**
   * Link hashtags to a post
   */
  async linkToPost(postId, hashtags) {
    const db = getDatabase();
    
    // First, remove existing links
    await db.query('DELETE FROM post_hashtags WHERE post_id = $1', [postId]);
    
    if (!hashtags || hashtags.length === 0) return;
    
    // Get or create each hashtag and link to post
    for (const tagName of hashtags) {
      const hashtag = await this.getOrCreate(tagName);
      
      await db.query(
        `INSERT INTO post_hashtags (post_id, hashtag_id) 
         VALUES ($1, $2) 
         ON CONFLICT DO NOTHING`,
        [postId, hashtag.id]
      );
    }
    
    // Update hashtag counts
    await this.updateCounts();
  },

  /**
   * Update hashtag post counts
   */
  async updateCounts() {
    const db = getDatabase();
    await db.query(`
      UPDATE hashtags h
      SET post_count = (
        SELECT COUNT(*) FROM post_hashtags ph
        JOIN posts p ON ph.post_id = p.id
        WHERE ph.hashtag_id = h.id AND p.status = 'published'
      ),
      updated_at = NOW()
    `);
  },

  /**
   * Get trending hashtags
   */
  async getTrending(limit = 10, days = 7) {
    const db = getDatabase();
    
    const result = await db.query(`
      SELECT h.*, 
             COUNT(DISTINCT ph.post_id) as recent_posts
      FROM hashtags h
      JOIN post_hashtags ph ON ph.hashtag_id = h.id
      JOIN posts p ON ph.post_id = p.id
      WHERE p.status = 'published' 
        AND p.created_at > NOW() - INTERVAL '${days} days'
      GROUP BY h.id
      ORDER BY recent_posts DESC, h.post_count DESC
      LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  },

  /**
   * Get posts by hashtag
   */
  async getPostsByHashtag(hashtagName, options = {}) {
    const { page = 0, size = 20, sortBy = 'created_at', order = 'DESC' } = options;
    const db = getDatabase();
    
    const normalizedName = hashtagName.toLowerCase().trim();
    
    const result = await db.query(`
      SELECT p.*, 
             u.display_name as author_name, 
             u.avatar_url as author_avatar,
             COUNT(DISTINCT r.id) as reactions_count,
             COUNT(DISTINCT c.id) as comments_count
      FROM posts p
      JOIN post_hashtags ph ON ph.post_id = p.id
      JOIN hashtags h ON ph.hashtag_id = h.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN reactions r ON r.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      WHERE h.name = $1 AND p.status = 'published'
      GROUP BY p.id, u.display_name, u.avatar_url
      ORDER BY ${sortBy === 'trending' ? 'p.trending_score' : 'p.created_at'} ${order}
      LIMIT $2 OFFSET $3`,
      [normalizedName, size, page * size]
    );
    
    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM posts p
      JOIN post_hashtags ph ON ph.post_id = p.id
      JOIN hashtags h ON ph.hashtag_id = h.id
      WHERE h.name = $1 AND p.status = 'published'`,
      [normalizedName]
    );
    
    return {
      items: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      size,
      hashtag: normalizedName
    };
  },

  /**
   * Search hashtags
   */
  async search(query, limit = 10) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT * FROM hashtags 
       WHERE name ILIKE $1 
       ORDER BY post_count DESC 
       LIMIT $2`,
      [`%${query}%`, limit]
    );
    return result.rows;
  },

  /**
   * Get hashtags for a post
   */
  async getByPostId(postId) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT h.* FROM hashtags h
       JOIN post_hashtags ph ON ph.hashtag_id = h.id
       WHERE ph.post_id = $1
       ORDER BY h.name`,
      [postId]
    );
    return result.rows;
  }
};

