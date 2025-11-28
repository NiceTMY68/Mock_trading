import { validationResult } from 'express-validator';
import { PostModel } from '../models/postModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Get posts with pagination
 * GET /api/posts
 */
export const getPosts = async (req, res) => {
  try {
    const {
      page = 0,
      size = 20,
      userId = null,
      status = 'published',
      sortBy = 'created_at',
      order = 'DESC',
      search = null
    } = req.query;

    const result = await PostModel.findMany({
      page: parseInt(page),
      size: parseInt(size),
      userId: userId ? parseInt(userId) : null,
      status,
      sortBy,
      order,
      search
    });

    res.json(createResponse(true, 'Posts retrieved', {
      posts: result.items,
      pagination: {
        page: result.page,
        size: result.size,
        total: result.total,
        pages: result.pages
      }
    }));
  } catch (error) {
    logger.error('Get posts error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Get single post with details
 * GET /api/posts/:id
 */
export const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || null;

    const post = await PostModel.findByIdWithDetails(parseInt(id), userId);

    if (!post) {
      return res.status(404).json(createResponse(false, 'Post not found'));
    }

    res.json(createResponse(true, 'Post retrieved', { post }));
  } catch (error) {
    logger.error('Get post error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Create new post
 * POST /api/posts
 */
export const createPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { title, content, tags = [], mentions = [] } = req.body;

    const post = await PostModel.create(userId, {
      title,
      content,
      tags: Array.isArray(tags) ? tags : [],
      mentions: Array.isArray(mentions) ? mentions : []
    });

    logger.info(`Post created: ${post.id} by user ${userId}`);

    res.status(201).json(createResponse(true, 'Post created', { post }));
  } catch (error) {
    logger.error('Create post error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Update post
 * PUT /api/posts/:id
 */
export const updatePost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { id } = req.params;
    const { title, content, tags, mentions, status } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
    if (mentions !== undefined) updates.mentions = Array.isArray(mentions) ? mentions : [];
    if (status !== undefined) updates.status = status;

    const post = await PostModel.update(parseInt(id), userId, updates);

    if (!post) {
      return res.status(404).json(createResponse(false, 'Post not found or unauthorized'));
    }

    res.json(createResponse(true, 'Post updated', { post }));
  } catch (error) {
    logger.error('Update post error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Delete post
 * DELETE /api/posts/:id
 */
export const deletePost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const post = await PostModel.delete(parseInt(id), userId);

    if (!post) {
      return res.status(404).json(createResponse(false, 'Post not found or unauthorized'));
    }

    logger.info(`Post deleted: ${id} by user ${userId}`);

    res.json(createResponse(true, 'Post deleted'));
  } catch (error) {
    logger.error('Delete post error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

