import express from 'express';
import { apiLimiter } from '../middleware/rateLimiter.js';
import * as newsController from '../controllers/newsController.js';

const router = express.Router();

// GET /api/news - Get crypto news
router.get('/', apiLimiter, newsController.getCryptoNews);

// GET /api/news/search - Search news by keyword
router.get('/search', apiLimiter, newsController.searchNews);

// GET /api/news/category/:category - Get news by category
router.get('/category/:category', apiLimiter, newsController.getNewsByCategory);

export default router;

