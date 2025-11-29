/**
 * Moderation Controller
 * 
 * Handles admin moderation actions
 */

import { getContentModerationService } from '../services/contentModerationService.js';
import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * GET /api/admin/moderation/queue
 * Get pending flags for review
 */
export const getModerationQueue = async (req, res) => {
  try {
    const { page = 0, size = 20, type } = req.query;
    const moderationService = getContentModerationService();

    const result = await moderationService.getPendingFlags({
      page: parseInt(page),
      size: parseInt(size),
      flagType: type || null
    });

    res.json(createResponse(true, 'Moderation queue retrieved', result));
  } catch (error) {
    logger.error('Error getting moderation queue:', error);
    res.status(500).json(createResponse(false, 'Failed to get moderation queue'));
  }
};

/**
 * GET /api/admin/moderation/stats
 * Get moderation statistics
 */
export const getModerationStats = async (req, res) => {
  try {
    const moderationService = getContentModerationService();
    const stats = await moderationService.getStats();

    res.json(createResponse(true, 'Moderation stats retrieved', stats));
  } catch (error) {
    logger.error('Error getting moderation stats:', error);
    res.status(500).json(createResponse(false, 'Failed to get moderation stats'));
  }
};

/**
 * PUT /api/admin/moderation/:flagId/approve
 * Approve a flagged post
 */
export const approveFlag = async (req, res) => {
  try {
    const { flagId } = req.params;
    const { notes } = req.body;
    const adminId = req.user.userId;

    const moderationService = getContentModerationService();
    await moderationService.approvePost(parseInt(flagId), adminId, notes || '');

    res.json(createResponse(true, 'Post approved'));
  } catch (error) {
    logger.error('Error approving flag:', error);
    res.status(500).json(createResponse(false, 'Failed to approve post'));
  }
};

/**
 * PUT /api/admin/moderation/:flagId/reject
 * Reject and remove a flagged post
 */
export const rejectFlag = async (req, res) => {
  try {
    const { flagId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;

    if (!reason) {
      return res.status(400).json(createResponse(false, 'Reason is required'));
    }

    const moderationService = getContentModerationService();
    await moderationService.rejectPost(parseInt(flagId), adminId, reason);

    res.json(createResponse(true, 'Post rejected and removed'));
  } catch (error) {
    logger.error('Error rejecting flag:', error);
    res.status(500).json(createResponse(false, error.message || 'Failed to reject post'));
  }
};

/**
 * GET /api/admin/moderation/keywords
 * Get all banned keywords
 */
export const getBannedKeywords = async (req, res) => {
  try {
    const db = getDatabase();
    const { category, active = 'true' } = req.query;

    let query = 'SELECT * FROM banned_keywords WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    if (active === 'true') {
      query += ` AND is_active = true`;
    }

    query += ' ORDER BY category, severity DESC';

    const result = await db.query(query, params);
    res.json(createResponse(true, 'Banned keywords retrieved', { keywords: result.rows }));
  } catch (error) {
    logger.error('Error getting banned keywords:', error);
    res.status(500).json(createResponse(false, 'Failed to get banned keywords'));
  }
};

/**
 * POST /api/admin/moderation/keywords
 * Add a new banned keyword
 */
export const addBannedKeyword = async (req, res) => {
  try {
    const { keyword, category, severity, is_regex, language, description } = req.body;

    if (!keyword || !category) {
      return res.status(400).json(createResponse(false, 'Keyword and category are required'));
    }

    const db = getDatabase();
    const result = await db.query(
      `INSERT INTO banned_keywords (keyword, category, severity, is_regex, language, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        keyword,
        category,
        severity || 'medium',
        is_regex || false,
        language || 'all',
        description || null
      ]
    );

    // Refresh moderation service cache
    const moderationService = getContentModerationService();
    await moderationService.loadBannedKeywords();

    res.status(201).json(createResponse(true, 'Keyword added', { keyword: result.rows[0] }));
  } catch (error) {
    logger.error('Error adding banned keyword:', error);
    res.status(500).json(createResponse(false, 'Failed to add banned keyword'));
  }
};

/**
 * DELETE /api/admin/moderation/keywords/:id
 * Delete a banned keyword
 */
export const deleteBannedKeyword = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    await db.query('DELETE FROM banned_keywords WHERE id = $1', [id]);

    // Refresh moderation service cache
    const moderationService = getContentModerationService();
    await moderationService.loadBannedKeywords();

    res.json(createResponse(true, 'Keyword deleted'));
  } catch (error) {
    logger.error('Error deleting banned keyword:', error);
    res.status(500).json(createResponse(false, 'Failed to delete banned keyword'));
  }
};

/**
 * PUT /api/admin/moderation/keywords/:id
 * Update a banned keyword
 */
export const updateBannedKeyword = async (req, res) => {
  try {
    const { id } = req.params;
    const { keyword, category, severity, is_regex, language, description, is_active } = req.body;

    const db = getDatabase();
    const result = await db.query(
      `UPDATE banned_keywords 
       SET keyword = COALESCE($1, keyword),
           category = COALESCE($2, category),
           severity = COALESCE($3, severity),
           is_regex = COALESCE($4, is_regex),
           language = COALESCE($5, language),
           description = COALESCE($6, description),
           is_active = COALESCE($7, is_active),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [keyword, category, severity, is_regex, language, description, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createResponse(false, 'Keyword not found'));
    }

    // Refresh moderation service cache
    const moderationService = getContentModerationService();
    await moderationService.loadBannedKeywords();

    res.json(createResponse(true, 'Keyword updated', { keyword: result.rows[0] }));
  } catch (error) {
    logger.error('Error updating banned keyword:', error);
    res.status(500).json(createResponse(false, 'Failed to update banned keyword'));
  }
};

/**
 * GET /api/admin/moderation/removed-posts
 * Get removed posts history
 */
export const getRemovedPosts = async (req, res) => {
  try {
    const { page = 0, size = 20, userId } = req.query;
    const db = getDatabase();

    let query = `
      SELECT rp.*, 
             u.display_name as author_name,
             u.email as author_email,
             admin.display_name as removed_by_name
      FROM removed_posts rp
      JOIN users u ON rp.user_id = u.id
      LEFT JOIN users admin ON rp.removed_by = admin.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND rp.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    query += ` ORDER BY rp.removed_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(size), parseInt(page) * parseInt(size));

    const result = await db.query(query, params);

    // Get total count
    const countQuery = userId 
      ? 'SELECT COUNT(*) as total FROM removed_posts WHERE user_id = $1'
      : 'SELECT COUNT(*) as total FROM removed_posts';
    const countResult = await db.query(countQuery, userId ? [userId] : []);

    res.json(createResponse(true, 'Removed posts retrieved', {
      posts: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      size: parseInt(size)
    }));
  } catch (error) {
    logger.error('Error getting removed posts:', error);
    res.status(500).json(createResponse(false, 'Failed to get removed posts'));
  }
};

/**
 * GET /api/admin/moderation/low-trust-users
 * Get users with low trust level
 */
export const getLowTrustUsers = async (req, res) => {
  try {
    const db = getDatabase();
    const result = await db.query(`
      SELECT id, email, display_name, trust_level, removed_posts_count, created_at
      FROM users
      WHERE trust_level = 'low_trust'
      ORDER BY removed_posts_count DESC
    `);

    res.json(createResponse(true, 'Low trust users retrieved', { users: result.rows }));
  } catch (error) {
    logger.error('Error getting low trust users:', error);
    res.status(500).json(createResponse(false, 'Failed to get low trust users'));
  }
};

/**
 * PUT /api/admin/moderation/users/:userId/trust-level
 * Update user trust level
 */
export const updateUserTrustLevel = async (req, res) => {
  try {
    const { userId } = req.params;
    const { trustLevel } = req.body;

    const validLevels = ['normal', 'low_trust', 'trusted', 'verified'];
    if (!validLevels.includes(trustLevel)) {
      return res.status(400).json(createResponse(false, 'Invalid trust level'));
    }

    const db = getDatabase();
    await db.query(
      'UPDATE users SET trust_level = $1 WHERE id = $2',
      [trustLevel, userId]
    );

    res.json(createResponse(true, 'User trust level updated'));
  } catch (error) {
    logger.error('Error updating user trust level:', error);
    res.status(500).json(createResponse(false, 'Failed to update user trust level'));
  }
};

