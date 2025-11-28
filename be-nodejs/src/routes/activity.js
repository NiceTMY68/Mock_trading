import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import * as activityController from '../controllers/activityController.js';

const router = express.Router();

// GET /api/activity - Get recent activity (protected)
router.get('/', authenticate, apiLimiter, activityController.getRecentActivity);

export default router;

