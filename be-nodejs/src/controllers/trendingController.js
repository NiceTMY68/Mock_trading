/**
 * Trending Controller
 * 
 * Handles trending posts and content
 */

import { ViewModel } from '../models/viewModel.js';
import { HashtagModel } from '../models/hashtagModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Get trending posts
 * GET /api/trending/posts
 */
export const getTrendingPosts = async (req, res) => {
  try {
    const { page = 0, size = 20, days = 7 } = req.query;

    const result = await ViewModel.getTrendingPosts({
      page: parseInt(page),
      size: parseInt(size),
      days: parseInt(days)
    });

    res.json(createResponse(true, 'Trending posts retrieved', {
      posts: result.items.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content.substring(0, 200) + (p.content.length > 200 ? '...' : ''),
        tags: p.tags,
        viewCount: p.view_count,
        bookmarkCount: p.bookmark_count,
        trendingScore: parseFloat(p.trending_score) || 0,
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
    logger.error('Get trending posts error:', error);
    res.status(500).json(createResponse(false, 'Failed to get trending posts'));
  }
};

/**
 * Get trending hashtags
 * GET /api/trending/hashtags
 */
export const getTrendingHashtags = async (req, res) => {
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
 * Update trending scores (admin/cron job)
 * POST /api/trending/update-scores
 */
export const updateTrendingScores = async (req, res) => {
  try {
    await ViewModel.updateTrendingScores();
    await HashtagModel.updateCounts();

    logger.info('Trending scores updated');
    res.json(createResponse(true, 'Trending scores updated'));
  } catch (error) {
    logger.error('Update trending scores error:', error);
    res.status(500).json(createResponse(false, 'Failed to update trending scores'));
  }
};

/**
 * Get trending overview (posts + hashtags combined)
 * GET /api/trending
 */
export const getTrendingOverview = async (req, res) => {
  try {
    const { postLimit = 10, hashtagLimit = 10, days = 7 } = req.query;

    const [posts, hashtags] = await Promise.all([
      ViewModel.getTrendingPosts({ page: 0, size: parseInt(postLimit), days: parseInt(days) }),
      HashtagModel.getTrending(parseInt(hashtagLimit), parseInt(days))
    ]);

    res.json(createResponse(true, 'Trending overview retrieved', {
      posts: posts.items.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content.substring(0, 150) + (p.content.length > 150 ? '...' : ''),
        viewCount: p.view_count,
        trendingScore: parseFloat(p.trending_score) || 0,
        reactionsCount: parseInt(p.reactions_count) || 0,
        commentsCount: parseInt(p.comments_count) || 0,
        authorName: p.author_name,
        createdAt: p.created_at
      })),
      hashtags: hashtags.map(h => ({
        id: h.id,
        name: h.name,
        postCount: h.post_count,
        recentPosts: parseInt(h.recent_posts)
      }))
    }));
  } catch (error) {
    logger.error('Get trending overview error:', error);
    res.status(500).json(createResponse(false, 'Failed to get trending overview'));
  }
};

