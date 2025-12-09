import express from 'express';
import { optionalAuth, authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import * as trendingController from '../controllers/trendingController.js';

const router = express.Router();

// GET /api/trending - Get trending overview
router.get('/', optionalAuth, apiLimiter, trendingController.getTrendingOverview);

// GET /api/trending/posts - Get trending posts
router.get('/posts', optionalAuth, apiLimiter, trendingController.getTrendingPosts);

// GET /api/trending/hashtags - Get trending hashtags
router.get('/hashtags', apiLimiter, trendingController.getTrendingHashtags);

// POST /api/trending/update-scores - Update trending scores (admin only)
router.post('/update-scores', authenticate, requireAdmin, trendingController.updateTrendingScores);

export default router;

