import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import * as bookmarkController from '../controllers/bookmarkController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/bookmarks - Get user's bookmarks
router.get('/', apiLimiter, bookmarkController.getBookmarks);

// GET /api/bookmarks/collections - Get user's collections
router.get('/collections', apiLimiter, bookmarkController.getCollections);

// GET /api/bookmarks/check/:postId - Check if post is bookmarked
router.get('/check/:postId', apiLimiter, bookmarkController.checkBookmark);

// POST /api/bookmarks - Add bookmark
router.post('/', apiLimiter, bookmarkController.addBookmark);

// PUT /api/bookmarks/:postId/collection - Move to collection
router.put('/:postId/collection', apiLimiter, bookmarkController.moveToCollection);

// DELETE /api/bookmarks/:postId - Remove bookmark
router.delete('/:postId', apiLimiter, bookmarkController.removeBookmark);

export default router;

