import { getDatabase } from '../config/database.js';
export class AdminModel {
  static async getDashboardStats() {
    const db = getDatabase();
    
    const [
      totalUsers,
      activeUsers,
      totalPosts,
      pendingPosts,
      totalComments,
      totalReports,
      pendingReports,
      totalAlerts,
      activeAlerts
    ] = await Promise.all([
      db.query(`SELECT COUNT(*) as count FROM users`),
      db.query(`SELECT COUNT(*) as count FROM users WHERE is_active = true`),
      db.query(`SELECT COUNT(*) as count FROM posts`),
      db.query(`SELECT COUNT(*) as count FROM posts WHERE status = 'pending'`),
      db.query(`SELECT COUNT(*) as count FROM comments`),
      db.query(`SELECT COUNT(*) as count FROM reports`),
      db.query(`SELECT COUNT(*) as count FROM reports WHERE status = 'pending'`),
      db.query(`SELECT COUNT(*) as count FROM alerts`),
      db.query(`SELECT COUNT(*) as count FROM alerts WHERE is_active = true`)
    ]);

    const recentRegistrations = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`
    );

    const recentPosts = await db.query(
      `SELECT COUNT(*) as count FROM posts WHERE created_at >= NOW() - INTERVAL '7 days'`
    );
    
    return {
      users: {
        total: parseInt(totalUsers.rows[0].count),
        active: parseInt(activeUsers.rows[0].count),
        recentRegistrations: parseInt(recentRegistrations.rows[0].count)
      },
      posts: {
        total: parseInt(totalPosts.rows[0].count),
        pending: parseInt(pendingPosts.rows[0].count),
        recent: parseInt(recentPosts.rows[0].count)
      },
      comments: {
        total: parseInt(totalComments.rows[0].count)
      },
      reports: {
        total: parseInt(totalReports.rows[0].count),
        pending: parseInt(pendingReports.rows[0].count)
      },
      alerts: {
        total: parseInt(totalAlerts.rows[0].count),
        active: parseInt(activeAlerts.rows[0].count)
      }
    };
  }
  static async getAllUsers({ page = 0, size = 50, search = null, role = null, isActive = null } = {}) {
    const db = getDatabase();
    
    let query = `
      SELECT 
        u.id,
        u.email,
        u.display_name,
        u.role,
        u.avatar_url,
        u.is_active,
        u.last_login,
        u.created_at,
        COUNT(DISTINCT p.id) as posts_count,
        COUNT(DISTINCT c.id) as comments_count,
        COUNT(DISTINCT w.id) as watchlists_count
      FROM users u
      LEFT JOIN posts p ON p.user_id = u.id
      LEFT JOIN comments c ON c.user_id = u.id
      LEFT JOIN watchlists w ON w.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (u.email ILIKE $${paramIndex} OR u.display_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (role) {
      query += ` AND u.role = $${paramIndex++}`;
      params.push(role);
    }
    
    if (isActive !== null) {
      query += ` AND u.is_active = $${paramIndex++}`;
      params.push(isActive);
    }
    
    query += ` GROUP BY u.id ORDER BY u.created_at DESC`;

    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(DISTINCT u.id) as count FROM'
    ).replace(/GROUP BY[\s\S]*$/, '');
    
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(size, page * size);
    
    const result = await db.query(query, params);
    
    return {
      users: result.rows.map(row => ({
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        role: row.role,
        avatarUrl: row.avatar_url,
        isActive: row.is_active,
        lastLogin: row.last_login,
        createdAt: row.created_at,
        stats: {
          postsCount: parseInt(row.posts_count),
          commentsCount: parseInt(row.comments_count),
          watchlistsCount: parseInt(row.watchlists_count)
        }
      })),
      total
    };
  }
  static async getPostsForModeration({ page = 0, size = 50, status = null, search = null } = {}) {
    const db = getDatabase();
    
    let query = `
      SELECT 
        p.*,
        u.display_name as author_name,
        u.email as author_email,
        u.role as author_role,
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
    
    if (status) {
      query += ` AND p.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (search) {
      query += ` AND (p.title ILIKE $${paramIndex} OR p.content ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` GROUP BY p.id, u.id ORDER BY p.created_at DESC`;

    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(DISTINCT p.id) as count FROM'
    ).replace(/GROUP BY[\s\S]*$/, '');
    
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(size, page * size);
    
    const result = await db.query(query, params);
    
    return {
      posts: result.rows,
      total
    };
  }
}

