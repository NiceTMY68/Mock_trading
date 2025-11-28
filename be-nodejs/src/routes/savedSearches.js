import express from 'express';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';
import { body } from 'express-validator';
import * as savedSearchController from '../controllers/savedSearchController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get saved searches
router.get('/', apiLimiter, savedSearchController.getSavedSearches);

// Create saved search
router.post('/', apiLimiter, [
  body('name').notEmpty().isLength({ min: 1, max: 255 }),
  body('searchType').isIn(['coins', 'posts', 'news', 'all']),
  body('queryParams').isObject()
], savedSearchController.createSavedSearch);

// Delete saved search
router.delete('/:id', apiLimiter, savedSearchController.deleteSavedSearch);

export default router;

