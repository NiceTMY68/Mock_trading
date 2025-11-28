import express from 'express';
import { body } from 'express-validator';
import { apiLimiter, blogLimiter } from '../middleware/rateLimiter.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import * as postController from '../controllers/postController.js';
import * as commentController from '../controllers/commentController.js';
import * as reactionController from '../controllers/reactionController.js';

const router = express.Router();

// Validation rules
const createPostValidation = [
  body('title').isLength({ min: 1, max: 200 }).trim(),
  body('content').isLength({ min: 1, max: 10000 }).trim(),
  body('tags').optional().isArray(),
  body('mentions').optional().isArray()
];

const updatePostValidation = [
  body('title').optional().isLength({ min: 1, max: 200 }).trim(),
  body('content').optional().isLength({ min: 1, max: 10000 }).trim(),
  body('tags').optional().isArray(),
  body('mentions').optional().isArray(),
  body('status').optional().isIn(['draft', 'published', 'archived'])
];

const createCommentValidation = [
  body('content').isLength({ min: 1, max: 2000 }).trim(),
  body('parentId').optional().isInt()
];

const updateCommentValidation = [
  body('content').isLength({ min: 1, max: 2000 }).trim()
];

// Public routes (optional auth)
router.get('/', optionalAuth, apiLimiter, postController.getPosts);
router.get('/:id', optionalAuth, apiLimiter, postController.getPost);
router.get('/:postId/comments', optionalAuth, apiLimiter, commentController.getComments);
router.get('/:postId/reactions', optionalAuth, apiLimiter, reactionController.getReactions);

// Protected routes (require auth)
router.post('/', authenticate, blogLimiter, createPostValidation, postController.createPost);
router.put('/:id', authenticate, apiLimiter, updatePostValidation, postController.updatePost);
router.delete('/:id', authenticate, apiLimiter, postController.deletePost);

// Comments
router.post('/:postId/comments', authenticate, apiLimiter, createCommentValidation, commentController.createComment);

// Reactions
router.post('/:postId/reactions', authenticate, apiLimiter, reactionController.toggleReaction);

export default router;

