import { getDatabase } from '../config/database.js';
export class FollowModel {
  static async follow(followerId, followingId) {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }
    
    const db = getDatabase();

    const existing = await db.query(
      `SELECT * FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const result = await db.query(
      `INSERT INTO user_follows (follower_id, following_id)
       VALUES ($1, $2)
       RETURNING *`,
      [followerId, followingId]
    );
    
    return result.rows[0];
  }
  static async unfollow(followerId, followingId) {
    const db = getDatabase();
    
    const result = await db.query(
      `DELETE FROM user_follows 
       WHERE follower_id = $1 AND following_id = $2
       RETURNING *`,
      [followerId, followingId]
    );
    
    return result.rows[0];
  }
  static async isFollowing(followerId, followingId) {
    const db = getDatabase();
    
    const result = await db.query(
      `SELECT * FROM user_follows 
       WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    
    return result.rows.length > 0;
  }
  static async getFollowers(userId) {
    const db = getDatabase();
    
    const result = await db.query(
      `SELECT 
        uf.follower_id,
        u.id,
        u.display_name,
        u.avatar_url,
        uf.created_at
      FROM user_follows uf
      JOIN users u ON uf.follower_id = u.id
      WHERE uf.following_id = $1
      ORDER BY uf.created_at DESC`,
      [userId]
    );
    
    return result.rows;
  }
  static async getFollowing(userId) {
    const db = getDatabase();
    
    const result = await db.query(
      `SELECT 
        uf.following_id,
        u.id,
        u.display_name,
        u.avatar_url,
        uf.created_at
      FROM user_follows uf
      JOIN users u ON uf.following_id = u.id
      WHERE uf.follower_id = $1
      ORDER BY uf.created_at DESC`,
      [userId]
    );
    
    return result.rows;
  }
  static async getFollowerCount(userId) {
    const db = getDatabase();
    
    const result = await db.query(
      `SELECT COUNT(*) as count FROM user_follows WHERE following_id = $1`,
      [userId]
    );
    
    return parseInt(result.rows[0].count);
  }
  static async getFollowingCount(userId) {
    const db = getDatabase();
    
    const result = await db.query(
      `SELECT COUNT(*) as count FROM user_follows WHERE follower_id = $1`,
      [userId]
    );
    
    return parseInt(result.rows[0].count);
  }
}

