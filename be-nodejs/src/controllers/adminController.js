import { AdminModel } from '../models/adminModel.js';
import { UserModel } from '../models/userModel.js';
import { PostModel } from '../models/postModel.js';
import { CommentModel } from '../models/commentModel.js';
import { ReportModel } from '../models/reportModel.js';
import { SystemLogModel } from '../models/systemLogModel.js';
import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Get admin dashboard stats
 * GET /api/admin/dashboard
 */
export const getDashboardStats = async (req, res) => {
  try {
    const stats = await AdminModel.getDashboardStats();
    res.json(createResponse(true, 'Dashboard stats retrieved', { stats }));
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get all users (admin only)
 * GET /api/admin/users
 */
export const getAllUsers = async (req, res) => {
  try {
    const { page = 0, size = 50, search, role, isActive } = req.query;
    
    const result = await AdminModel.getAllUsers({
      page: parseInt(page),
      size: parseInt(size),
      search: search || null,
      role: role || null,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : null
    });
    
    res.json(createResponse(true, 'Users retrieved', {
      users: result.users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(size),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(size))
      }
    }));
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get user details (admin only)
 * GET /api/admin/users/:id
 */
export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return res.status(400).json(createResponse(false, 'Invalid user ID'));
    }
    
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json(createResponse(false, 'User not found'));
    }
    
    const stats = await UserModel.getStats(userId);
    
    res.json(createResponse(true, 'User details retrieved', {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        socialLinks: user.social_links || {},
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        stats
      }
    }));
  } catch (error) {
    logger.error('Get user details error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Update user (admin only)
 * PUT /api/admin/users/:id
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { displayName, role, isActive, bio, avatarUrl } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json(createResponse(false, 'Invalid user ID'));
    }
    
    // Prevent admin from changing their own role or status
    if (req.user.userId === userId && (role !== undefined || isActive !== undefined)) {
      return res.status(400).json(createResponse(false, 'Cannot modify your own role or status'));
    }
    
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    
    const updatedUser = await UserModel.update(userId, updates);
    
    if (!updatedUser) {
      return res.status(404).json(createResponse(false, 'User not found'));
    }
    
    res.json(createResponse(true, 'User updated', {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.display_name,
        role: updatedUser.role,
        isActive: updatedUser.is_active
      }
    }));
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Delete user (admin only)
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return res.status(400).json(createResponse(false, 'Invalid user ID'));
    }
    
    // Prevent admin from deleting themselves
    if (req.user.userId === userId) {
      return res.status(400).json(createResponse(false, 'Cannot delete your own account'));
    }
    
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json(createResponse(false, 'User not found'));
    }
    
    // Delete user (cascade will handle related data)
    const db = (await import('../config/database.js')).getDatabase();
    await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
    
    logger.info(`User ${userId} deleted by admin ${req.user.userId}`);
    
    res.json(createResponse(true, 'User deleted'));
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get posts for moderation (admin only)
 * GET /api/admin/posts
 */
export const getPostsForModeration = async (req, res) => {
  try {
    const { page = 0, size = 50, status, search } = req.query;
    
    const result = await AdminModel.getPostsForModeration({
      page: parseInt(page),
      size: parseInt(size),
      status: status || null,
      search: search || null
    });
    
    res.json(createResponse(true, 'Posts retrieved', {
      posts: result.posts.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content,
        status: p.status,
        tags: p.tags || [],
        mentions: p.mentions || [],
        authorName: p.author_name,
        authorEmail: p.author_email,
        authorRole: p.author_role,
        commentsCount: parseInt(p.comments_count),
        reactionsCount: parseInt(p.reactions_count),
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(size),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(size))
      }
    }));
  } catch (error) {
    logger.error('Get posts for moderation error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Update post status (admin only)
 * PUT /api/admin/posts/:id/status
 */
export const updatePostStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'published', 'rejected', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(createResponse(false, 'Invalid status'));
    }
    
    const post = await PostModel.findById(parseInt(id));
    if (!post) {
      return res.status(404).json(createResponse(false, 'Post not found'));
    }
    
    const db = (await import('../config/database.js')).getDatabase();
    const result = await db.query(
      `UPDATE posts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, parseInt(id)]
    );
    
    logger.info(`Post ${id} status updated to ${status} by admin ${req.user.userId}`);
    
    res.json(createResponse(true, 'Post status updated', {
      post: {
        id: result.rows[0].id,
        status: result.rows[0].status
      }
    }));
  } catch (error) {
    logger.error('Update post status error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Delete post (admin only)
 * DELETE /api/admin/posts/:id
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id);
    
    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).json(createResponse(false, 'Post not found'));
    }
    
    const db = (await import('../config/database.js')).getDatabase();
    await db.query(`DELETE FROM posts WHERE id = $1`, [postId]);
    
    logger.info(`Post ${postId} deleted by admin ${req.user.userId}`);
    
    res.json(createResponse(true, 'Post deleted'));
  } catch (error) {
    logger.error('Delete post error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Pin/unpin post (admin only)
 * PUT /api/admin/posts/:id/pin
 */
export const togglePinPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { pinned } = req.body;
    
    const post = await PostModel.findById(parseInt(id));
    if (!post) {
      return res.status(404).json(createResponse(false, 'Post not found'));
    }
    
    const db = (await import('../config/database.js')).getDatabase();
    const result = await db.query(
      `UPDATE posts SET is_pinned = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [pinned === true, parseInt(id)]
    );
    
    logger.info(`Post ${id} ${pinned ? 'pinned' : 'unpinned'} by admin ${req.user.userId}`);
    
    res.json(createResponse(true, `Post ${pinned ? 'pinned' : 'unpinned'}`, {
      post: {
        id: result.rows[0].id,
        is_pinned: result.rows[0].is_pinned
      }
    }));
  } catch (error) {
    logger.error('Toggle pin post error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Feature/unfeature post (admin only)
 * PUT /api/admin/posts/:id/feature
 */
export const toggleFeaturePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;
    
    const post = await PostModel.findById(parseInt(id));
    if (!post) {
      return res.status(404).json(createResponse(false, 'Post not found'));
    }
    
    const db = (await import('../config/database.js')).getDatabase();
    const result = await db.query(
      `UPDATE posts SET is_featured = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [featured === true, parseInt(id)]
    );
    
    logger.info(`Post ${id} ${featured ? 'featured' : 'unfeatured'} by admin ${req.user.userId}`);
    
    res.json(createResponse(true, `Post ${featured ? 'featured' : 'unfeatured'}`, {
      post: {
        id: result.rows[0].id,
        is_featured: result.rows[0].is_featured
      }
    }));
  } catch (error) {
    logger.error('Toggle feature post error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Force logout user (revoke all refresh tokens) (admin only)
 * POST /api/admin/users/:id/logout
 */
export const forceLogoutUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return res.status(400).json(createResponse(false, 'Invalid user ID'));
    }
    
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json(createResponse(false, 'User not found'));
    }
    
    const { RefreshTokenModel } = await import('../models/refreshTokenModel.js');
    await RefreshTokenModel.deleteAllForUser(userId);
    
    logger.info(`All refresh tokens revoked for user ${userId} by admin ${req.user.userId}`);
    
    res.json(createResponse(true, 'User logged out from all devices'));
  } catch (error) {
    logger.error('Force logout error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Invalidate cache (admin only)
 * POST /api/admin/cache/invalidate
 */
export const invalidateCache = async (req, res) => {
  try {
    const { pattern } = req.body;
    
    const { getRedis } = await import('../config/redis.js');
    const redis = getRedis();
    
    if (!redis) {
      return res.status(503).json(createResponse(false, 'Redis not available'));
    }
    
    let deletedCount = 0;
    
    if (pattern) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        deletedCount = await redis.del(keys);
      }
    } else {
      const keys = await redis.keys('binance:*');
      if (keys.length > 0) {
        deletedCount = await redis.del(keys);
      }
    }
    
    logger.info(`Cache invalidated: ${deletedCount} keys deleted by admin ${req.user.userId}`);
    
    res.json(createResponse(true, 'Cache invalidated', {
      deletedCount
    }));
  } catch (error) {
    logger.error('Invalidate cache error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get cache stats (admin only)
 * GET /api/admin/cache/stats
 */
export const getCacheStats = async (req, res) => {
  try {
    const { getRedis } = await import('../config/redis.js');
    const redis = getRedis();
    
    if (!redis) {
      return res.json(createResponse(true, 'Cache stats', {
        available: false,
        message: 'Redis not available'
      }));
    }
    
    const info = await redis.info('stats');
    const keys = await redis.keys('*');
    
    const stats = {
      available: true,
      totalKeys: keys.length,
      binanceKeys: keys.filter(k => k.startsWith('binance:')).length,
      newsKeys: keys.filter(k => k.startsWith('news:')).length,
      otherKeys: keys.filter(k => !k.startsWith('binance:') && !k.startsWith('news:')).length
    };
    
    res.json(createResponse(true, 'Cache stats retrieved', { stats }));
  } catch (error) {
    logger.error('Get cache stats error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Delete comment (admin only)
 * DELETE /api/admin/comments/:id
 */
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const commentId = parseInt(id);
    
    const comment = await CommentModel.findById(commentId);
    if (!comment) {
      return res.status(404).json(createResponse(false, 'Comment not found'));
    }
    
    const db = (await import('../config/database.js')).getDatabase();
    await db.query(`DELETE FROM comments WHERE id = $1`, [commentId]);
    
    logger.info(`Comment ${commentId} deleted by admin ${req.user.userId}`);
    
    res.json(createResponse(true, 'Comment deleted'));
  } catch (error) {
    logger.error('Delete comment error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get system logs (admin only)
 * GET /api/admin/logs
 */
export const getSystemLogs = async (req, res) => {
  try {
    const { level, userId, limit = 100, offset = 0, startDate, endDate } = req.query;
    
    const logs = await SystemLogModel.findMany({
      level: level || null,
      userId: userId ? parseInt(userId) : null,
      limit: parseInt(limit),
      offset: parseInt(offset),
      startDate: startDate || null,
      endDate: endDate || null
    });
    
    res.json(createResponse(true, 'System logs retrieved', {
      logs: logs.map(log => ({
        id: log.id,
        level: log.level,
        message: log.message,
        metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata,
        userId: log.user_id,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        createdAt: log.created_at
      }))
    }));
  } catch (error) {
    logger.error('Get system logs error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get log statistics (admin only)
 * GET /api/admin/logs/stats
 */
export const getLogStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const counts = await SystemLogModel.getCountsByLevel(parseInt(days));
    
    res.json(createResponse(true, 'Log stats retrieved', {
      counts: counts.map(c => ({
        level: c.level,
        count: parseInt(c.count)
      }))
    }));
  } catch (error) {
    logger.error('Get log stats error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};


/**
 * Get security audit - failed login attempts (admin only)
 * GET /api/admin/security/failed-logins
 */
export const getFailedLogins = async (req, res) => {
  try {
    const { page = 0, size = 50, email, ipAddress, startDate, endDate } = req.query;
    const { FailedLoginModel } = await import('../models/failedLoginModel.js');

    const result = await FailedLoginModel.findMany({
      page: parseInt(page),
      size: parseInt(size),
      email: email || null,
      ipAddress: ipAddress || null,
      startDate: startDate || null,
      endDate: endDate || null
    });

    res.json(createResponse(true, 'Failed login attempts retrieved', {
      attempts: result.items,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(size))
      }
    }));
  } catch (error) {
    logger.error('Get failed logins error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get security audit stats (admin only)
 * GET /api/admin/security/stats
 */
export const getSecurityStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const { FailedLoginModel } = await import('../models/failedLoginModel.js');

    const [stats, topEmails, topIPs] = await Promise.all([
      FailedLoginModel.getStats(parseInt(days)),
      FailedLoginModel.getTopFailedEmails(10),
      FailedLoginModel.getTopFailedIPs(10)
    ]);

    res.json(createResponse(true, 'Security stats retrieved', {
      stats: {
        totalAttempts: parseInt(stats.total_attempts),
        uniqueEmails: parseInt(stats.unique_emails),
        uniqueIPs: parseInt(stats.unique_ips),
        lastAttempt: stats.last_attempt
      },
      topFailedEmails: topEmails,
      topFailedIPs: topIPs
    }));
  } catch (error) {
    logger.error('Get security stats error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get all announcements (admin only)
 * GET /api/admin/announcements
 */
export const getAllAnnouncements = async (req, res) => {
  try {
    const { page = 0, size = 20, isActive, type } = req.query;
    const { AnnouncementModel } = await import('../models/announcementModel.js');
    
    const result = await AnnouncementModel.findMany({
      page: parseInt(page),
      size: parseInt(size),
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : null,
      type: type || null
    });

    res.json(createResponse(true, 'Announcements retrieved', {
      announcements: result.items,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(size))
      }
    }));
  } catch (error) {
    logger.error('Get all announcements error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Create announcement (admin only)
 * POST /api/admin/announcements
 */
export const createAnnouncement = async (req, res) => {
  try {
    const { title, content, type = 'info', priority = 'normal', startsAt, endsAt } = req.body;
    const { AnnouncementModel } = await import('../models/announcementModel.js');

    if (!title || !content) {
      return res.status(400).json(createResponse(false, 'Title and content are required'));
    }

    const announcement = await AnnouncementModel.create({
      title,
      content,
      type,
      priority,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      endsAt: endsAt ? new Date(endsAt) : null,
      createdBy: req.user.userId
    });

    logger.info(`Announcement created: ${announcement.id} by admin ${req.user.userId}`);

    res.status(201).json(createResponse(true, 'Announcement created', { announcement }));
  } catch (error) {
    logger.error('Create announcement error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Update announcement (admin only)
 * PUT /api/admin/announcements/:id
 */
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, priority, isActive, startsAt, endsAt } = req.body;
    const { AnnouncementModel } = await import('../models/announcementModel.js');

    const announcement = await AnnouncementModel.findById(parseInt(id));
    if (!announcement) {
      return res.status(404).json(createResponse(false, 'Announcement not found'));
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (type !== undefined) updates.type = type;
    if (priority !== undefined) updates.priority = priority;
    if (isActive !== undefined) updates.isActive = isActive;
    if (startsAt !== undefined) updates.startsAt = new Date(startsAt);
    if (endsAt !== undefined) updates.endsAt = endsAt ? new Date(endsAt) : null;

    const updated = await AnnouncementModel.update(parseInt(id), updates);

    logger.info(`Announcement updated: ${id} by admin ${req.user.userId}`);

    res.json(createResponse(true, 'Announcement updated', { announcement: updated }));
  } catch (error) {
    logger.error('Update announcement error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Delete announcement (admin only)
 * DELETE /api/admin/announcements/:id
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { AnnouncementModel } = await import('../models/announcementModel.js');

    const announcement = await AnnouncementModel.findById(parseInt(id));
    if (!announcement) {
      return res.status(404).json(createResponse(false, 'Announcement not found'));
    }

    await AnnouncementModel.delete(parseInt(id));

    logger.info(`Announcement deleted: ${id} by admin ${req.user.userId}`);

    res.json(createResponse(true, 'Announcement deleted'));
  } catch (error) {
    logger.error('Delete announcement error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

