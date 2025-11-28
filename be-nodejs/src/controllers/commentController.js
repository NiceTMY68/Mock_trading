import { validationResult } from 'express-validator';
import { CommentModel } from '../models/commentModel.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Get comments for a post
 * GET /api/posts/:postId/comments
 */
export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await CommentModel.findByPostId(parseInt(postId));

    res.json(createResponse(true, 'Comments retrieved', { comments }));
  } catch (error) {
    logger.error('Get comments error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Create comment
 * POST /api/posts/:postId/comments
 */
export const createComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { postId } = req.params;
    const { content, parentId } = req.body;

    const comment = await CommentModel.create(
      userId,
      parseInt(postId),
      content,
      parentId ? parseInt(parentId) : null
    );

    logger.info(`Comment created: ${comment.id} by user ${userId}`);

    res.status(201).json(createResponse(true, 'Comment created', { comment }));
  } catch (error) {
    logger.error('Create comment error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Update comment
 * PUT /api/comments/:id
 */
export const updateComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(createResponse(false, 'Validation failed', { errors: errors.array() }));
    }

    const userId = req.user.userId;
    const { id } = req.params;
    const { content } = req.body;

    const comment = await CommentModel.update(parseInt(id), userId, content);

    if (!comment) {
      return res.status(404).json(createResponse(false, 'Comment not found or unauthorized'));
    }

    res.json(createResponse(true, 'Comment updated', { comment }));
  } catch (error) {
    logger.error('Update comment error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

/**
 * Delete comment
 * DELETE /api/comments/:id
 */
export const deleteComment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const comment = await CommentModel.delete(parseInt(id), userId);

    if (!comment) {
      return res.status(404).json(createResponse(false, 'Comment not found or unauthorized'));
    }

    logger.info(`Comment deleted: ${id} by user ${userId}`);

    res.json(createResponse(true, 'Comment deleted'));
  } catch (error) {
    logger.error('Delete comment error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

