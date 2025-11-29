import { validationResult } from 'express-validator';
import { PostModel } from '../models/postModel.js';
import { HashtagModel } from '../models/hashtagModel.js';
import { ViewModel } from '../models/viewModel.js';
import { NotificationModel } from '../models/notificationModel.js';
import { FollowModel } from '../models/followModel.js';
import { UploadModel } from '../models/uploadModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';
import { getContentModerationService } from '../services/contentModerationService.js';

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

    // Record view (async, don't block response)
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      await ViewModel.recordView(parseInt(id), {
        userId,
        ip,
        userAgent
      });
    } catch (viewError) {
      logger.error('Failed to record view:', viewError);
    }

    // Get hashtags for the post
    let hashtags = [];
    try {
      hashtags = await HashtagModel.getByPostId(parseInt(id));
    } catch (hashtagError) {
      logger.error('Failed to get hashtags:', hashtagError);
    }

    // Get images for the post
    let images = [];
    try {
      images = await UploadModel.getByPostId(parseInt(id));
    } catch (imageError) {
      logger.error('Failed to get images:', imageError);
    }

    res.json(createResponse(true, 'Post retrieved', { 
      post: {
        ...post,
        hashtags: hashtags.map(h => h.name),
        images
      }
    }));
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
    const { title, content, tags = [], mentions = [], imageIds = [] } = req.body;

    // Create the post
    const post = await PostModel.create(userId, {
      title,
      content,
      tags: Array.isArray(tags) ? tags : [],
      mentions: Array.isArray(mentions) ? mentions : []
    });

    // Link images to post
    if (imageIds && imageIds.length > 0) {
      try {
        for (let i = 0; i < imageIds.length; i++) {
          await UploadModel.linkToPost(post.id, parseInt(imageIds[i]), i);
        }
        logger.info(`Linked ${imageIds.length} images to post ${post.id}`);
      } catch (imageError) {
        logger.error('Failed to link images:', imageError);
      }
    }

    // Check content for violations (async, don't block response)
    try {
      const moderationService = getContentModerationService();
      const contentToCheck = `${title} ${content}`;
      const checkResult = await moderationService.checkContent(contentToCheck);

      if (!checkResult.isClean) {
        // Flag post for admin review (post still published, just flagged)
        await moderationService.flagPost(
          post.id,
          'auto_detected',
          checkResult.matchedKeywords,
          checkResult.severity
        );
        logger.warn(`Post ${post.id} flagged for violations: ${checkResult.matchedKeywords.join(', ')}`);
      }
    } catch (moderationError) {
      // Don't fail post creation if moderation check fails
      logger.error('Content moderation check failed:', moderationError);
    }

    // Auto-detect and link hashtags
    try {
      const contentWithTags = `${title} ${content}`;
      const extractedHashtags = HashtagModel.extractHashtags(contentWithTags);
      if (extractedHashtags.length > 0) {
        await HashtagModel.linkToPost(post.id, extractedHashtags);
        logger.info(`Linked ${extractedHashtags.length} hashtags to post ${post.id}`);
      }
    } catch (hashtagError) {
      logger.error('Hashtag extraction failed:', hashtagError);
    }

    // Notify followers about new post
    try {
      const followers = await FollowModel.getFollowers(userId, { page: 0, size: 1000 });
      
      for (const follower of followers.items) {
        await NotificationModel.create({
          userId: follower.follower_id,
          type: 'new_post',
          title: 'New Post',
          message: `Someone you follow posted: "${title.substring(0, 50)}${title.length > 50 ? '...' : ''}"`,
          data: { postId: post.id, authorId: userId }
        });
      }
      
      if (followers.items.length > 0) {
        logger.info(`Notified ${followers.items.length} followers about new post ${post.id}`);
      }
    } catch (notifyError) {
      logger.error('Failed to notify followers:', notifyError);
    }

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

    // Check updated content for violations
    if (title !== undefined || content !== undefined) {
      try {
        const moderationService = getContentModerationService();
        const contentToCheck = `${post.title} ${post.content}`;
        const checkResult = await moderationService.checkContent(contentToCheck);

        if (!checkResult.isClean) {
          await moderationService.flagPost(
            post.id,
            'auto_detected',
            checkResult.matchedKeywords,
            checkResult.severity
          );
          logger.warn(`Updated post ${post.id} flagged for violations`);
        }
      } catch (moderationError) {
        logger.error('Content moderation check failed:', moderationError);
      }

      // Re-extract and link hashtags
      try {
        const contentWithTags = `${post.title} ${post.content}`;
        const extractedHashtags = HashtagModel.extractHashtags(contentWithTags);
        await HashtagModel.linkToPost(post.id, extractedHashtags);
      } catch (hashtagError) {
        logger.error('Hashtag update failed:', hashtagError);
      }
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

