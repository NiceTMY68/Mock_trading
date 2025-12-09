/**
 * Content Moderation Service
 * 
 * Checks content against blacklist and flags violations
 */

import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

class ContentModerationService {
  constructor() {
    this.bannedKeywords = [];
    this.lastRefresh = null;
    this.refreshInterval = 5 * 60 * 1000;
  }

  async loadBannedKeywords() {
    try {
      const db = getDatabase();
      const result = await db.query(
        'SELECT * FROM banned_keywords WHERE is_active = true ORDER BY severity DESC'
      );
      this.bannedKeywords = result.rows;
      this.lastRefresh = Date.now();
      logger.info(`Loaded ${this.bannedKeywords.length} banned keywords`);
    } catch (error) {
      logger.error('Failed to load banned keywords:', error);
      if (this.bannedKeywords.length === 0) {
        this.bannedKeywords = this.getHardcodedPatterns();
      }
    }
  }

  getHardcodedPatterns() {
    return [
      { keyword: 'send.*receive.*double', category: 'scam', severity: 'high', is_regex: true },
      { keyword: 'guaranteed.*profit', category: 'scam', severity: 'high', is_regex: true },
      { keyword: 'private.*key', category: 'security', severity: 'critical', is_regex: true },
      { keyword: 'seed.*phrase', category: 'security', severity: 'high', is_regex: true },
      { keyword: 'metamask-', category: 'phishing', severity: 'critical', is_regex: false },
    ];
  }

  async ensureKeywordsLoaded() {
    if (!this.lastRefresh || Date.now() - this.lastRefresh > this.refreshInterval) {
      await this.loadBannedKeywords();
    }
  }

  /**
   * Normalize text for better matching
   * - Remove special characters used to bypass filters (d.i.t → dit)
   * - Handle Unicode lookalikes
   */
  normalizeText(text) {
    let normalized = text.toLowerCase();
    
    normalized = normalized.replace(/(\w)[.\-_*@#!]+(\w)/g, '$1$2');
    
    const unicodeMap = {
      'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x',
      '𝐚': 'a', '𝐛': 'b', '𝐜': 'c', '𝐝': 'd', '𝐞': 'e',
      '𝕒': 'a', '𝕓': 'b', '𝕔': 'c', '𝕕': 'd', '𝕖': 'e',
      'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e',
      '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5',
      '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
      '@': 'a', '4': 'a', '3': 'e', '1': 'i', '0': 'o', '$': 's', '5': 's',
    };
    
    for (const [from, to] of Object.entries(unicodeMap)) {
      normalized = normalized.replace(new RegExp(from, 'g'), to);
    }
    
    normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    return normalized;
  }

  async checkContent(content) {
    await this.ensureKeywordsLoaded();

    const violations = [];
    const normalizedContent = this.normalizeText(content);
    const originalLower = content.toLowerCase();

    for (const keyword of this.bannedKeywords) {
      let isMatch = false;

      if (keyword.is_regex) {
        try {
          const regex = new RegExp(keyword.keyword, 'gi');
          isMatch = regex.test(normalizedContent) || regex.test(originalLower);
        } catch (e) {
          const keywordLower = keyword.keyword.toLowerCase();
          isMatch = normalizedContent.includes(keywordLower) || originalLower.includes(keywordLower);
        }
      } else {
        const keywordLower = keyword.keyword.toLowerCase();
        isMatch = normalizedContent.includes(keywordLower) || originalLower.includes(keywordLower);
      }

      if (isMatch) {
        violations.push({
          keyword: keyword.keyword,
          category: keyword.category,
          severity: keyword.severity,
          description: keyword.description
        });
      }
    }

    let overallSeverity = 'none';
    if (violations.length > 0) {
      const severityOrder = ['low', 'medium', 'high', 'critical'];
      overallSeverity = violations.reduce((max, v) => {
        const currentIndex = severityOrder.indexOf(v.severity);
        const maxIndex = severityOrder.indexOf(max);
        return currentIndex > maxIndex ? v.severity : max;
      }, 'low');
    }

    return {
      isClean: violations.length === 0,
      violations,
      severity: overallSeverity,
      matchedKeywords: violations.map(v => v.keyword)
    };
  }

  async flagPost(postId, flagType, matchedKeywords = [], severity = 'medium') {
    try {
      const db = getDatabase();
      
      const existing = await db.query(
        'SELECT id FROM content_flags WHERE post_id = $1 AND status = $2',
        [postId, 'pending']
      );

      if (existing.rows.length > 0) {
        await db.query(
          `UPDATE content_flags 
           SET matched_keywords = array_cat(matched_keywords, $1),
               severity = CASE 
                 WHEN severity < $2 THEN $2 
                 ELSE severity 
               END
           WHERE id = $3`,
          [matchedKeywords, severity, existing.rows[0].id]
        );
        return existing.rows[0].id;
      }

      const result = await db.query(
        `INSERT INTO content_flags (post_id, flag_type, matched_keywords, severity)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [postId, flagType, matchedKeywords, severity]
      );

      logger.info(`Post ${postId} flagged for review (${flagType})`);
      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to flag post:', error);
      throw error;
    }
  }

  async approvePost(flagId, adminId, notes = '') {
    try {
      const db = getDatabase();
      await db.query(
        `UPDATE content_flags 
         SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2
         WHERE id = $3`,
        [adminId, notes, flagId]
      );
      logger.info(`Flag ${flagId} approved by admin ${adminId}`);
    } catch (error) {
      logger.error('Failed to approve post:', error);
      throw error;
    }
  }

  /**
   * Reject/Remove a flagged post (admin action)
   * Moves post to removed_posts table and updates user trust level
   */
  async rejectPost(flagId, adminId, reason = '') {
    const db = getDatabase();
    
    try {
      await db.query('BEGIN');

      const flagResult = await db.query(
        `SELECT cf.*, p.user_id, p.title, p.content, p.tags, p.created_at as original_created_at
         FROM content_flags cf
         JOIN posts p ON cf.post_id = p.id
         WHERE cf.id = $1`,
        [flagId]
      );

      if (flagResult.rows.length === 0) {
        throw new Error('Flag not found');
      }

      const flag = flagResult.rows[0];

      await db.query(
        `INSERT INTO removed_posts 
         (original_post_id, user_id, title, content, tags, removal_reason, matched_keywords, removed_by, original_created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          flag.post_id,
          flag.user_id,
          flag.title,
          flag.content,
          flag.tags,
          reason,
          flag.matched_keywords,
          adminId,
          flag.original_created_at
        ]
      );

      await db.query(
        `UPDATE content_flags 
         SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2
         WHERE id = $3`,
        [adminId, reason, flagId]
      );

      await db.query('DELETE FROM posts WHERE id = $1', [flag.post_id]);

      await db.query(
        `UPDATE users 
         SET removed_posts_count = removed_posts_count + 1
         WHERE id = $1`,
        [flag.user_id]
      );

      const userResult = await db.query(
        'SELECT removed_posts_count FROM users WHERE id = $1',
        [flag.user_id]
      );

      if (userResult.rows[0].removed_posts_count >= 3) {
        await db.query(
          "UPDATE users SET trust_level = 'low_trust' WHERE id = $1",
          [flag.user_id]
        );
        logger.warn(`User ${flag.user_id} marked as low_trust`);
      }

      await db.query('COMMIT');
      logger.info(`Post ${flag.post_id} rejected and removed by admin ${adminId}`);
    } catch (error) {
      await db.query('ROLLBACK');
      logger.error('Failed to reject post:', error);
      throw error;
    }
  }

  async getPendingFlags(options = {}) {
    const { page = 0, size = 20, flagType = null } = options;
    const db = getDatabase();

    let query = `
      SELECT cf.*, 
             p.title as post_title, 
             p.content as post_content,
             p.user_id as post_user_id,
             u.display_name as author_name,
             u.email as author_email,
             u.trust_level as author_trust_level
      FROM content_flags cf
      JOIN posts p ON cf.post_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE cf.status = 'pending'
    `;

    const params = [];
    let paramIndex = 1;

    if (flagType) {
      query += ` AND cf.flag_type = $${paramIndex++}`;
      params.push(flagType);
    }

    query += ` ORDER BY 
      CASE cf.severity 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
      END,
      cf.created_at ASC`;

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(size, page * size);

    const result = await db.query(query, params);

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM content_flags WHERE status = 'pending'${flagType ? ' AND flag_type = $1' : ''}`,
      flagType ? [flagType] : []
    );

    return {
      flags: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      size
    };
  }

  async getStats() {
    const db = getDatabase();

    const stats = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE flag_type = 'auto_detected') as auto_detected_count,
        COUNT(*) FILTER (WHERE flag_type = 'user_reported') as user_reported_count
      FROM content_flags
    `);

    const lowTrustUsers = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE trust_level = 'low_trust'"
    );

    return {
      ...stats.rows[0],
      low_trust_users: parseInt(lowTrustUsers.rows[0].count)
    };
  }
}

let moderationService = null;

export const getContentModerationService = () => {
  if (!moderationService) {
    moderationService = new ContentModerationService();
  }
  return moderationService;
};

export default ContentModerationService;

