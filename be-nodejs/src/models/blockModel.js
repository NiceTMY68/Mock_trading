/**
 * Block Model
 * 
 * Handles blocking users
 */

import { getDatabase } from '../config/database.js';

export const BlockModel = {
  /**
   * Block a user
   */
  async block(blockerId, blockedId, reason = null) {
    const db = getDatabase();
    
    // Can't block yourself
    if (blockerId === blockedId) {
      throw new Error('Cannot block yourself');
    }

    const result = await db.query(
      `INSERT INTO user_blocks (blocker_id, blocked_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING
       RETURNING *`,
      [blockerId, blockedId, reason]
    );

    // Also unfollow if following
    await db.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [blockerId, blockedId]
    );
    await db.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [blockedId, blockerId]
    );

    return result.rows[0];
  },

  /**
   * Unblock a user
   */
  async unblock(blockerId, blockedId) {
    const db = getDatabase();
    const result = await db.query(
      'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2 RETURNING *',
      [blockerId, blockedId]
    );
    return result.rows[0];
  },

  /**
   * Check if user is blocked
   */
  async isBlocked(blockerId, blockedId) {
    const db = getDatabase();
    const result = await db.query(
      'SELECT id FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, blockedId]
    );
    return result.rows.length > 0;
  },

  /**
   * Check if either user has blocked the other (bidirectional)
   */
  async hasBlockRelation(userId1, userId2) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT id FROM user_blocks 
       WHERE (blocker_id = $1 AND blocked_id = $2) 
          OR (blocker_id = $2 AND blocked_id = $1)`,
      [userId1, userId2]
    );
    return result.rows.length > 0;
  },

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(userId, options = {}) {
    const { page = 0, size = 20 } = options;
    const db = getDatabase();

    const result = await db.query(
      `SELECT ub.*, u.display_name, u.email, u.avatar_url, u.created_at as user_created_at
       FROM user_blocks ub
       JOIN users u ON ub.blocked_id = u.id
       WHERE ub.blocker_id = $1
       ORDER BY ub.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, size, page * size]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM user_blocks WHERE blocker_id = $1',
      [userId]
    );

    return {
      items: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      size
    };
  },

  /**
   * Get IDs of all users blocked by or blocking this user
   * Useful for filtering content
   */
  async getBlockedUserIds(userId) {
    const db = getDatabase();
    const result = await db.query(
      `SELECT DISTINCT 
         CASE 
           WHEN blocker_id = $1 THEN blocked_id 
           ELSE blocker_id 
         END as user_id
       FROM user_blocks 
       WHERE blocker_id = $1 OR blocked_id = $1`,
      [userId]
    );
    return result.rows.map(r => r.user_id);
  }
};

