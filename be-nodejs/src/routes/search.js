import express from 'express';
import { apiLimiter } from '../middleware/rateLimiter.js';
import * as searchController from '../controllers/searchController.js';

const router = express.Router();

// GET /api/search - Global search
router.get('/', apiLimiter, searchController.globalSearch);

export default router;

