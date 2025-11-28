import express from 'express';
import { body } from 'express-validator';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';
import * as commentController from '../controllers/commentController.js';

const router = express.Router();

// Validation rules
const updateCommentValidation = [
  body('content').isLength({ min: 1, max: 2000 }).trim()
];

// Protected routes
router.put('/:id', authenticate, apiLimiter, updateCommentValidation, commentController.updateComment);
router.delete('/:id', authenticate, apiLimiter, commentController.deleteComment);

export default router;

