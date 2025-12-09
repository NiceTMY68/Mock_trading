import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import * as hashtagController from '../controllers/hashtagController.js';

const router = express.Router();

// GET /api/hashtags - Get all hashtags
router.get('/', apiLimiter, hashtagController.getAllHashtags);

// GET /api/hashtags/trending - Get trending hashtags
router.get('/trending', apiLimiter, hashtagController.getTrending);

// GET /api/hashtags/search - Search hashtags
router.get('/search', apiLimiter, hashtagController.searchHashtags);

// GET /api/hashtags/:name/posts - Get posts by hashtag
router.get('/:name/posts', optionalAuth, apiLimiter, hashtagController.getPostsByHashtag);

export default router;

