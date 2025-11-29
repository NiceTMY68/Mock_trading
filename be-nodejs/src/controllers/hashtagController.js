/**
 * Hashtag Controller
 * 
 * Handles hashtag operations
 */

import { HashtagModel } from '../models/hashtagModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Get trending hashtags
 * GET /api/hashtags/trending
 */
export const getTrending = async (req, res) => {
  try {
    const { limit = 10, days = 7 } = req.query;
    
    const hashtags = await HashtagModel.getTrending(
      parseInt(limit), 
      parseInt(days)
    );

    res.json(createResponse(true, 'Trending hashtags retrieved', { 
      hashtags: hashtags.map(h => ({
        id: h.id,
        name: h.name,
        postCount: h.post_count,
        recentPosts: parseInt(h.recent_posts)
      }))
    }));
  } catch (error) {
    logger.error('Get trending hashtags error:', error);
    res.status(500).json(createResponse(false, 'Failed to get trending hashtags'));
  }
};

/**
 * Search hashtags
 * GET /api/hashtags/search
 */
export const searchHashtags = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json(createResponse(false, 'Search query is required'));
    }

    const hashtags = await HashtagModel.search(q.trim(), parseInt(limit));

    res.json(createResponse(true, 'Hashtags found', { 
      hashtags: hashtags.map(h => ({
        id: h.id,
        name: h.name,
        postCount: h.post_count
      }))
    }));
  } catch (error) {
    logger.error('Search hashtags error:', error);
    res.status(500).json(createResponse(false, 'Failed to search hashtags'));
  }
};

/**
 * Get posts by hashtag
 * GET /api/hashtags/:name/posts
 */
export const getPostsByHashtag = async (req, res) => {
  try {
    const { name } = req.params;
    const { page = 0, size = 20, sortBy = 'created_at', order = 'DESC' } = req.query;

    const result = await HashtagModel.getPostsByHashtag(name, {
      page: parseInt(page),
      size: parseInt(size),
      sortBy,
      order
    });

    res.json(createResponse(true, 'Posts retrieved', {
      hashtag: result.hashtag,
      posts: result.items.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content,
        tags: p.tags,
        viewCount: p.view_count,
        bookmarkCount: p.bookmark_count,
        reactionsCount: parseInt(p.reactions_count) || 0,
        commentsCount: parseInt(p.comments_count) || 0,
        authorName: p.author_name,
        authorAvatar: p.author_avatar,
        createdAt: p.created_at
      })),
      pagination: {
        page: result.page,
        size: result.size,
        total: result.total
      }
    }));
  } catch (error) {
    logger.error('Get posts by hashtag error:', error);
    res.status(500).json(createResponse(false, 'Failed to get posts'));
  }
};

/**
 * Get all hashtags (paginated)
 * GET /api/hashtags
 */
export const getAllHashtags = async (req, res) => {
  try {
    const { page = 0, size = 50, sortBy = 'post_count' } = req.query;
    
    const { getDatabase } = await import('../config/database.js');
    const db = getDatabase();
    
    const validSortBy = ['post_count', 'name', 'created_at'];
    const actualSortBy = validSortBy.includes(sortBy) ? sortBy : 'post_count';
    const sortOrder = actualSortBy === 'name' ? 'ASC' : 'DESC';
    
    const result = await db.query(`
      SELECT * FROM hashtags 
      WHERE post_count > 0
      ORDER BY ${actualSortBy} ${sortOrder}
      LIMIT $1 OFFSET $2`,
      [parseInt(size), parseInt(page) * parseInt(size)]
    );
    
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM hashtags WHERE post_count > 0'
    );

    res.json(createResponse(true, 'Hashtags retrieved', {
      hashtags: result.rows.map(h => ({
        id: h.id,
        name: h.name,
        postCount: h.post_count,
        createdAt: h.created_at
      })),
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total: parseInt(countResult.rows[0].total)
      }
    }));
  } catch (error) {
    logger.error('Get all hashtags error:', error);
    res.status(500).json(createResponse(false, 'Failed to get hashtags'));
  }
};

