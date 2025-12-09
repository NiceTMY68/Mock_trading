import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class ActivityModel {
  static async getRecentActivity(userId, { limit = 20, offset = 0 } = {}) {
    const db = getDatabase();

    const postsQuery = `
      SELECT 
        'post' as type,
        id,
        title as title,
        content as description,
        created_at,
        user_id
      FROM posts
      WHERE user_id = $1 AND status = 'published'
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const commentsQuery = `
      SELECT 
        'comment' as type,
        id,
        content as title,
        content as description,
        created_at,
        user_id,
        post_id
      FROM comments
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    // Watchlist activity from watchlists table (uses JSONB symbols column)
    const watchlistQuery = `
      SELECT 
        'watchlist' as type,
        id,
        name as title,
        CONCAT('Updated watchlist: ', name) as description,
        updated_at as created_at,
        user_id
      FROM watchlists
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT $2 OFFSET $3
    `;

    // Execute queries with error handling
    const safeQuery = async (query, params) => {
      try {
        return await db.query(query, params);
      } catch (error) {
        logger.warn(`Activity query failed: ${error.message}`);
        return { rows: [] };
      }
    };

    const [posts, comments, watchlists] = await Promise.all([
      safeQuery(postsQuery, [userId, limit, offset]),
      safeQuery(commentsQuery, [userId, limit, offset]),
      safeQuery(watchlistQuery, [userId, limit, offset])
    ]);

    const activities = [
      ...posts.rows.map(row => ({
        type: 'post',
        id: row.id,
        title: row.title,
        description: row.description?.substring(0, 100),
        createdAt: row.created_at,
        metadata: { postId: row.id }
      })),
      ...comments.rows.map(row => ({
        type: 'comment',
        id: row.id,
        title: 'Commented on post',
        description: row.description?.substring(0, 100),
        createdAt: row.created_at,
        metadata: { commentId: row.id, postId: row.post_id }
      })),
      ...watchlists.rows.map(row => ({
        type: 'watchlist',
        id: row.id,
        title: row.title,
        description: row.description,
        createdAt: row.created_at,
        metadata: { watchlistName: row.title }
      }))
    ];

    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return activities.slice(0, limit);
  }
}

